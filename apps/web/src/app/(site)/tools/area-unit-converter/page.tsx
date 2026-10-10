import type { Metadata } from "next";
import { AreaConverter } from "@/components/tools/area-converter";

export const metadata: Metadata = {
  title: "Area unit converter — marla, kanal, sq ft, sq yd, acre",
  description: "Convert between marla, kanal, square feet, square yards, square metres and acres, with 225 or 272.25 sq ft marla sizes.",
  alternates: { canonical: "/tools/area-unit-converter" },
};

export default function AreaUnitConverterPage() {
  return (
    <div className="container-px py-12">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Area unit converter</h1>
        <p className="mt-3 text-slate-500">Convert land and property sizes between marla, kanal, square feet, square yards, square metres and acres.</p>
      </div>
      <AreaConverter />
    </div>
  );
}
