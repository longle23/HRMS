"use client";

import { useEffect } from "react";

const EXTERNAL_LOGIN_URL = "https://ai-platform.sotransgroup.vn/login";

export default function Home() {
  useEffect(() => {
    window.location.replace(EXTERNAL_LOGIN_URL);
  }, []);

  return null;
}
