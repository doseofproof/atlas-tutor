import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function getOAuthUrl() {
  const kimiAuthUrl = import.meta.env.VITE_KIMI_AUTH_URL;
  const appID = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  const url = new URL(`${kimiAuthUrl}/api/oauth/authorize`);
  url.searchParams.set("client_id", appID);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "profile");
  url.searchParams.set("state", state);

  return url.toString();
}

export default function Login() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-xl font-bold text-primary-foreground">
            A
          </div>
          <CardTitle className="text-2xl">Atlas Tutor</CardTitle>
          <CardDescription className="text-balance">
            Your mastery-based coach for the Arkansas Real Estate Licensing Exam. Sign in to start — your
            progress syncs across devices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full"
            size="lg"
            onClick={() => {
              window.location.href = getOAuthUrl();
            }}
          >
            Sign in with Kimi
          </Button>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Adaptive lessons · Knowledge map · AI tutor chat · Spaced-repetition review
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
