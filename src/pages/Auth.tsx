import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { SignInWithApple } from "@capacitor-community/apple-sign-in";
import { createRandomString, getAppleSignInConfig, isNativeAppleSignInAvailable, sha256 } from "@/lib/appleAuth";

type Mode = "login" | "signup" | "forgot";

const Auth = () => {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) toast.error(error.message);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { display_name: displayName },
      },
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success("Check your email to confirm your account!");
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success("Check your email for a password reset link!");
  };

  const handleAppleSignIn = async () => {
    const { clientId, redirectURI, isConfigured } = getAppleSignInConfig();

    if (!isConfigured || !clientId || !redirectURI) {
      toast.error("Apple Sign-In is not configured yet. Set VITE_APPLE_CLIENT_ID and VITE_APPLE_REDIRECT_URI.");
      return;
    }

    setAppleLoading(true);

    try {
      const nonce = createRandomString();
      const hashedNonce = await sha256(nonce);
      const state = createRandomString(16);

      const result = await SignInWithApple.authorize({
        clientId,
        redirectURI,
        scopes: "email name",
        nonce: hashedNonce,
        state,
      });

      const { identityToken, givenName, familyName } = result.response;

      const { error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: identityToken,
        nonce,
      });

      if (error) throw error;

      const appleDisplayName = [givenName, familyName].filter(Boolean).join(" ").trim();
      if (appleDisplayName) {
        await supabase.auth.updateUser({
          data: { display_name: appleDisplayName },
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Apple Sign-In failed";
      toast.error(message);
    } finally {
      setAppleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            {mode === "login" ? "Sign In" : mode === "signup" ? "Create Account" : "Reset Password"}
          </CardTitle>
          <CardDescription>
            {mode === "login"
              ? "Enter your credentials to continue"
              : mode === "signup"
              ? "Fill in your details to get started"
              : "We'll send you a reset link"}
          </CardDescription>
        </CardHeader>
        {mode === "login" && isNativeAppleSignInAvailable() && (
          <div className="px-6 pb-2">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleAppleSignIn}
              disabled={appleLoading || loading}
            >
              {appleLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Continue with Apple
            </Button>
          </div>
        )}
        <form onSubmit={mode === "login" ? handleLogin : mode === "signup" ? handleSignup : handleForgotPassword}>
          <CardContent className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            {mode !== "forgot" && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "login" ? "Sign In" : mode === "signup" ? "Sign Up" : "Send Reset Link"}
            </Button>
            {mode === "login" && (
              <>
                <Button type="button" variant="link" size="sm" onClick={() => setMode("forgot")}>
                  Forgot password?
                </Button>
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <button type="button" className="text-primary underline" onClick={() => setMode("signup")}>
                    Sign up
                  </button>
                </p>
              </>
            )}
            {mode !== "login" && (
              <Button type="button" variant="link" size="sm" onClick={() => setMode("login")}>
                Back to sign in
              </Button>
            )}
            <div className="pt-2 text-center text-xs text-muted-foreground">
              By continuing, you agree to our{" "}
              <a href="/privacy" className="text-primary underline underline-offset-4">
                Privacy Policy
              </a>
              {" "}and can contact{" "}
              <a href="/support" className="text-primary underline underline-offset-4">
                Support
              </a>
              .
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default Auth;
