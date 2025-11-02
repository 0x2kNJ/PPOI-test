// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

contract FoxConnectUS is Ownable2Step, EIP712 {
    address[] treasuries;
    mapping(address => bool) treasuriesMap;

    address[] multiSendOperators;
    mapping(address => bool) multiSendOperatorMap;

    address[] withdrawOperators;
    mapping(address => bool) withdrawOperatorMap;

    mapping(bytes32 => bool) idHashMap;
    address signerAddress;

    address beneficiary;

    uint24 transferFromGasLimit;

    event WithdrawOperatorAdded(address indexed operator);
    event WithdrawOperatorRemoved(address indexed operator);
    event MultiSendOperatorAdded(address indexed operator);
    event MultiSendOperatorRemoved(address indexed operator);
    event BeneficiaryUpdated(address indexed previousBeneficiary, address indexed newBeneficiary);
    event SignerUpdated(address indexed previousSigner, address indexed newSigner);
    event TreasuryAdded(address);
    event TreasuryRemoved(address);
    event WithdrawalStatus(uint256 result, uint16 batchSize);
    event MultiSendStatus(uint256 result, uint16 batchSize);
    event TransferGasLimitUpdated(uint24 oldGasLimit, uint24 newGasLimit);

    uint16 constant MAX_ENTRIES = 256;

    constructor(
        address[] memory _treasuries,
        address _signerAddress,
        address[] memory _withdrawOperators,
        address[] memory _multiSendOperators,
        address _beneficiary,
        uint24 _transferFromGasLimit
    ) Ownable(_msgSender()) EIP712("FoxConnectUS", "1") {
        require(_withdrawOperators.length <= MAX_ENTRIES, "Cannot add more than 256 withdraw operators");
        require(_multiSendOperators.length <= MAX_ENTRIES, "Cannot add more than 256 multi-send operators");
        require(_treasuries.length <= MAX_ENTRIES, "Cannot add more than 256 treasuries");
        require(_withdrawOperators.length > 0, "At least one withdraw operator must be provided");
        require(_multiSendOperators.length > 0, "At least one multi-send operator must be provided");
        require(_treasuries.length > 0, "At least one treasury address must be provided");
        require(_signerAddress != address(0), "Zero address not allowed for signer address");
        require(_beneficiary != address(0), "Zero address not allowed for beneficiary address");

        require(_transferFromGasLimit > 0, "Transfer gas limit must be greater than 0");

        transferFromGasLimit = _transferFromGasLimit;
        signerAddress = _signerAddress;
        beneficiary = _beneficiary;

        for (uint8 i = 0; i < _treasuries.length; i++) {
            require(_treasuries[i] != address(0), "Zero address not allowed for treasury address");
            treasuriesMap[_treasuries[i]] = true;
            treasuries.push(_treasuries[i]);
        }

        for (uint8 i = 0; i < _multiSendOperators.length; i++) {
            require(_multiSendOperators[i] != address(0), "Zero address not allowed for multi-send operator address");
            multiSendOperatorMap[_multiSendOperators[i]] = true;
            multiSendOperators.push(_multiSendOperators[i]);
        }

        for (uint8 i = 0; i < _withdrawOperators.length; i++) {
            require(_withdrawOperators[i] != address(0), "Zero address not allowed for withdraw operator address");
            withdrawOperatorMap[_withdrawOperators[i]] = true;
            withdrawOperators.push(_withdrawOperators[i]);
        }
    }

    function _addAddress(address[] storage addresses, address newAddress, mapping(address => bool) storage map)
        private
    {
        require(!map[newAddress], "This address already exists");
        require(newAddress != address(0), "Zero address not allowed");
        require(addresses.length < MAX_ENTRIES, "Cannot add more than 256 addresses");

        addresses.push(newAddress);
        map[newAddress] = true;
    }

    function _removeAddress(address[] storage addresses, address addressToRemove, mapping(address => bool) storage map)
        private
    {
        require(addressToRemove != address(0), "Zero address not allowed");
        require(map[addressToRemove], "This address does not exist");

        uint8 index = 0;
        for (uint8 i = 0; i < addresses.length; i++) {
            if (addresses[i] == addressToRemove) {
                index = i;
                break;
            }
        }
        addresses[index] = addresses[addresses.length - 1];
        addresses.pop();
        map[addressToRemove] = false;
    }

    function setTransferGasLimit(uint24 _transferGasLimit) public onlyOwner {
        require(_transferGasLimit > 0, "Transfer gas limit must be greater than 0");
        emit TransferGasLimitUpdated(transferFromGasLimit, _transferGasLimit);
        transferFromGasLimit = _transferGasLimit;
    }

    function getTransferGasLimit() public view returns (uint24) {
        return transferFromGasLimit;
    }

    function multiSend(
        bytes32 _requestIdHash,
        address[] calldata _tokens,
        address[] calldata _beneficiaries,
        uint256[] calldata _amounts,
        uint256 _deadline,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) public {
        // An uninitialized array is more gas-efficient than using 'new address[](0)'.
        // This way, we avoid the overhead of initializing the array with n elements with the default value.
        address[] memory defaultTreasuries;
        multiSend(_requestIdHash, _tokens, _beneficiaries, defaultTreasuries, _amounts, _deadline, _v, _r, _s);
    }

    function multiSend(
        bytes32 _requestIdHash,
        address[] calldata _tokens,
        address[] calldata _beneficiaries,
        address[] memory _treasuries,
        uint256[] calldata _amounts,
        uint256 _deadline,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) public {
        require(block.timestamp <= _deadline, "This request missed the deadline");

        require(!idHashMap[_requestIdHash], "This request has already been executed");
        require(multiSendOperatorMap[msg.sender], "Only an operator can execute this function");
        require(
            _beneficiaries.length == _amounts.length, "The number of beneficiaries must match the number of amounts"
        );

        require(_beneficiaries.length == _tokens.length, "The number of beneficiaries must match the number of tokens");

        bool isDefaultTreasury = _treasuries.length == 0;
        // gas saving - avoid unnecessary checking when it is defaultTreasury
        require(
            isDefaultTreasury || _treasuries.length == _beneficiaries.length,
            "The number of beneficiaries must match the number of treasuries"
        );

        require(_beneficiaries.length > 0, "The number of beneficiaries must be greater than 0");
        require(_beneficiaries.length <= MAX_ENTRIES, "The maximum batch size is 256");

        idHashMap[_requestIdHash] = true;

        bytes32 TYPEHASH = keccak256(
            "MultiSend(bytes32 idHash,address[] tokens,address[] beneficiaries,uint256[] amounts,uint256 deadline)"
        );
        bytes32 structHash = keccak256(
            abi.encode(
                TYPEHASH,
                _requestIdHash,
                keccak256(abi.encodePacked(_tokens)),
                keccak256(abi.encodePacked(_beneficiaries)),
                keccak256(abi.encodePacked(_amounts)),
                _deadline
            )
        );

        bytes32 hash = _hashTypedDataV4(structHash);

        address signer = ECDSA.recover(hash, _v, _r, _s);

        require(signer == signerAddress, "Invalid multi send request data signature");

        uint256 status;
        for (uint256 i = 0; i < _beneficiaries.length; i++) {
            // Checking for isDefaultTreasury || treasuriesMap[_treasuries[i]] is more gas-efficient than only checking for treasuriesMap[_treasuries[i]]
            require(isDefaultTreasury || treasuriesMap[_treasuries[i]], "Treasury does not exist");

            // Within a batch, it’s possible for one transfer to fail while others succeeds.
            // We are using a low-level call because we need to get the return value of the transfer without reverting the whole transaction.
            // The contract emits an event containing the result of each transfer.
            bytes memory payload = abi.encodeWithSignature(
                "transferFrom(address,address,uint256)",
                isDefaultTreasury ? treasuries[0] : _treasuries[i],
                _beneficiaries[i],
                _amounts[i]
            );
            (bool success, bytes memory result) = _tokens[i].call{gas: transferFromGasLimit}(payload);
            status = success && (result.length == 0 || abi.decode(result, (bool))) ? (status << 1) | 0x1 : status << 1;
        }

        emit MultiSendStatus(status, uint16(_beneficiaries.length));
    }

    function withdraw(address[] calldata tokens, address[] calldata sources, uint256[] calldata amounts) public {
        require(withdrawOperatorMap[msg.sender], "Only an operator can execute this function");
        require(sources.length == amounts.length, "The number of sources must match the number of amounts");

        require(sources.length == tokens.length, "The number of sources must match the number of tokens");

        require(sources.length > 0, "The number of sources must be greater than 0");
        require(sources.length <= MAX_ENTRIES, "The maximum batch size is 256");

        uint256 status;

        for (uint256 i = 0; i < sources.length; i++) {
            bytes memory payload =
                abi.encodeWithSignature("transferFrom(address,address,uint256)", sources[i], beneficiary, amounts[i]);
            (bool success, bytes memory result) = tokens[i].call{gas: transferFromGasLimit}(payload);
            status = success && (result.length == 0 || abi.decode(result, (bool))) ? (status << 1) | 0x1 : status << 1;
        }

        emit WithdrawalStatus(status, uint16(sources.length));
    }

    function setBeneficiary(address _beneficiary) public onlyOwner {
        require(_beneficiary != beneficiary, "Cannot set the same address");
        require(_beneficiary != address(0), "Zero address not allowed");
        emit BeneficiaryUpdated(beneficiary, _beneficiary);
        beneficiary = _beneficiary;
    }

    function getBeneficiary() public view returns (address) {
        return beneficiary;
    }

    function getSignerAddress() public view returns (address) {
        return signerAddress;
    }

    function setSignerAddress(address _signerAddress) public onlyOwner {
        require(_signerAddress != signerAddress, "Cannot set the same address");
        require(_signerAddress != address(0), "Zero address not allowed for signer address");
        emit SignerUpdated(signerAddress, _signerAddress);
        signerAddress = _signerAddress;
    }

    function addTreasury(address _treasury) public onlyOwner {
        _addAddress(treasuries, _treasury, treasuriesMap);
        emit TreasuryAdded(_treasury);
    }

    function removeTreasury(address _treasury) public onlyOwner {
        _removeAddress(treasuries, _treasury, treasuriesMap);
        emit TreasuryRemoved(_treasury);
    }

    function getTreasuries() public view returns (address[] memory) {
        return treasuries;
    }

    function addWithdrawOperator(address _operator) public onlyOwner {
        _addAddress(withdrawOperators, _operator, withdrawOperatorMap);
        emit WithdrawOperatorAdded(_operator);
    }

    function removeWithdrawOperator(address _operator) public onlyOwner {
        _removeAddress(withdrawOperators, _operator, withdrawOperatorMap);
        emit WithdrawOperatorRemoved(_operator);
    }

    function getWithdrawOperators() public view returns (address[] memory) {
        return withdrawOperators;
    }

    function addMultiSendOperator(address _operator) public onlyOwner {
        _addAddress(multiSendOperators, _operator, multiSendOperatorMap);
        emit MultiSendOperatorAdded(_operator);
    }

    function removeMultiSendOperator(address _operator) public onlyOwner {
        _removeAddress(multiSendOperators, _operator, multiSendOperatorMap);
        emit MultiSendOperatorRemoved(_operator);
    }

    function getMultiSendOperators() public view returns (address[] memory) {
        return multiSendOperators;
    }
}
