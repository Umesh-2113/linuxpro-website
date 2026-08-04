import { WalletPanel } from "@/components/client/WalletPanel";

export default function WalletPage() {
  return (
    <>
      <header className="client-topbar">
        <div>
          <h1>My Wallet</h1>
          <p>Add money and pay for orders from your LinuxPro wallet balance.</p>
        </div>
      </header>
      <WalletPanel />
    </>
  );
}
