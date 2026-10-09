"use client";

import { Suspense } from "react";
import "./orders.css";
import { OrdersScreen } from "@/components/orders/orders-screen";

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-ground" />}>
      <OrdersScreen />
    </Suspense>
  );
}
