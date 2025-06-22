"use client";
import dynamic from "next/dynamic";

const TestClient = dynamic(() => import("../../components/TestClient"), { ssr: false });

export default function Test() {
  return <TestClient />;
}