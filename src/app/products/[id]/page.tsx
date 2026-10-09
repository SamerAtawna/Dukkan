"use client";

import { Suspense, useEffect } from "react";
import { useParams } from "next/navigation";
import "../products.css";
import { useProducts, selectProduct } from "@/lib/store-products";
import { TopNav } from "@/components/nav/top-nav";
import { ButtonLink } from "@/components/ui/button";
import { ProductEditor } from "@/components/products/product-editor";

export default function ProductEditPage() {
  return (
    <div className="r-products flex min-h-dvh flex-col bg-ground text-text">
      {/* On a dynamic route, hooks that read the URL (useParams, usePathname) must sit inside Suspense. */}
      <Suspense fallback={null}>
        <TopNav className="hidden md:flex" active="/products" />
        <EditRoute />
      </Suspense>
    </div>
  );
}

function EditRoute() {
  const { id } = useParams<{ id: string }>();
  const product = useProducts(selectProduct(id));
  const loaded = useProducts((s) => s.loaded);
  const load = useProducts((s) => s.load);

  useEffect(() => {
    void load();
  }, [load]);

  if (!product && !loaded) return null;

  if (!product) {
    return (
      <main className="col gap-[14px] md:gap-6">
        <h1 className="hd m-0 text-xl font-medium tracking-[-0.01em] md:text-[1.75rem]">This product is gone.</h1>
        <p className="m-0 text-[0.9375rem] text-text-2">It was removed or never existed.</p>
        <div>
          <ButtonLink href="/products">Back to products</ButtonLink>
        </div>
      </main>
    );
  }
  return <ProductEditor key={product.id} product={product} />;
}
