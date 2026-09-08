"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Mode = "password" | "otp";

const OTP_COUNTDOWN = 50; // seconds

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const sendOtp = useCallback(async () => {
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setLoading(true);
    setError(null);
    setInfo(null);

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false, // only existing registered users
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setOtpSent(true);
    setCountdown(OTP_COUNTDOWN);
    setInfo(`A 6-digit code has been sent to ${email}. It expires shortly.`);
  }, [email]);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/account");
    router.refresh();
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (otp.length < 6) {
      setError("Please enter the 6-digit code");
      setLoading(false);
      return;
    }

    const supabase = createClient();

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp.trim(),
      type: "email",
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/account");
    router.refresh();
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setOtp("");
    await sendOtp();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Sign in</CardTitle>
          <CardDescription>
            {mode === "password"
              ? "Enter your email and password"
              : "Sign in with a code sent to your email"}
          </CardDescription>
        </CardHeader>

        {/* Mode switcher */}
        <div className="px-6 flex gap-2 mb-2">
          <button
            type="button"
            onClick={() => {
              setMode("password");
              setError(null);
              setInfo(null);
              setOtpSent(false);
            }}
            className={`flex-1 text-sm py-2 rounded-md border transition-colors ${
              mode === "password"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background hover:bg-muted"
            }`}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("otp");
              setError(null);
              setInfo(null);
            }}
            className={`flex-1 text-sm py-2 rounded-md border transition-colors ${
              mode === "otp"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background hover:bg-muted"
            }`}
          >
            Email Code
          </button>
        </div>

        {mode === "password" ? (
          <form onSubmit={handlePasswordLogin}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>
              <p className="text-sm text-center text-muted-foreground">
                Don't have an account?{" "}
                <Link
                  href="/auth/register"
                  className="text-primary hover:underline"
                >
                  Create one
                </Link>
              </p>
            </CardFooter>
          </form>
        ) : (
          <form onSubmit={otpSent ? handleOtpVerify : (e) => { e.preventDefault(); sendOtp(); }}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                  {error}
                </div>
              )}
              {info && (
                <div className="p-3 text-sm text-green-800 bg-green-50 border border-green-200 rounded-md">
                  {info}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="otp-email">Email</Label>
                <Input
                  id="otp-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={otpSent && countdown > 0}
                />
              </div>

              {otpSent && (
                <div className="space-y-2">
                  <Label htmlFor="otp">6-digit code</Label>
                  <Input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={8}
                    placeholder="123456"
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 8))
                    }
                    required
                    autoFocus
                    className="text-center text-lg tracking-widest font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the code sent to your email.
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col space-y-3">
              {!otpSent ? (
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Sending code..." : "Send login code"}
                </Button>
              ) : (
                <>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Verifying..." : "Verify & Sign in"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={countdown > 0 || loading}
                    onClick={handleResend}
                  >
                    {countdown > 0
                      ? `Resend code in ${countdown}s`
                      : "Resend 6-digit code"}
                  </Button>

                  <button
                    type="button"
                    className="text-sm text-muted-foreground hover:underline"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp("");
                      setInfo(null);
                      setError(null);
                      setCountdown(0);
                    }}
                  >
                    Use a different email
                  </button>
                </>
              )}

              <p className="text-sm text-center text-muted-foreground pt-2">
                Don't have an account?{" "}
                <Link
                  href="/auth/register"
                  className="text-primary hover:underline"
                >
                  Create one
                </Link>
              </p>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
