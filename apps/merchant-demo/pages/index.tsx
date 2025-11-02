import dynamic from "next/dynamic";

const Demo = dynamic(() => import("@/components/X402SubscriptionsDemo"), { ssr: false });

export default function Home() {
  return <Demo />;
}
