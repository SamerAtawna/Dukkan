"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import "../../orders.css";
import { OrderScreen } from "@/components/orders/order-screen";

function ShipRoute() {
  const { id } = useParams<{ id: string }>();
  return <OrderScreen id={id} ship />;
}

/** The order screen with the "Add tracking number" sheet open. */
export default function ShipPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-ground" />}>
      <ShipRoute />
    </Suspense>
  );
}
