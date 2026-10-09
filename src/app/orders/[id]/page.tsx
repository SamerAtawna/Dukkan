"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import "../orders.css";
import { OrderScreen } from "@/components/orders/order-screen";

function OrderRoute() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  return <OrderScreen id={id} forceStepChanged={params.get("stepChanged") === "1"} />;
}

export default function OrderPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-ground" />}>
      <OrderRoute />
    </Suspense>
  );
}
