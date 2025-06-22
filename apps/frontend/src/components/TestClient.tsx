"use client";
import { useQuery } from "@tanstack/react-query";
import React from "react";

const fetchMe = async () => {
  const res = await fetch("http://localhost:3333/auth/me", {
    method: "GET",
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Non authentifié");
  }
  return res.json();
};

export default function TestClient() {
  const { data: me, isLoading, isError, error } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Page Test</h1>
      {isLoading && <div>Chargement...</div>}
      {isError && <div className="text-red-500">Erreur : {(error as Error).message}</div>}
      {me && (
        <div>
          Bonjour {me.user.username} ({me.user.role})
        </div>
      )}
      {!isLoading && !me && !isError && (
        <div>Non authentifié</div>
      )}
    </div>
  );
}