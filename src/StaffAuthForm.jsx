import { useState } from "react";
import {
  Box,
  Button,
  Input,
  VStack,
  Heading,
  Text,
  Alert,
} from "@chakra-ui/react";
import { supabase } from "./supabaseClient";

function StaffAuthForm({ onAuthed }) {
  const [mode, setMode] = useState("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    setError(null);
    setLoading(true);

    const [data, error] = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, invite_code: inviteCode },
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    onAuthed(data.session);
  }

  async function handleSignIn() {
    setError(null);
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", data.user.id)
      .single();

    setLoading(false);

    if (profileError || !profile) {
      setError("Could not load your profile.");
    }
    if (profile.role === "doctor") {
      await supabase.auth.SignOut();
      setError(
        "This portal is for staff and managers. Use the Doctor sign-in instead.",
      );
      return;
    }

    onAuthed(data.session);
  }
  return (
    <Box
      maxW="360px"
      mx="auto"
      mt={16}
      p={8}
      borderWidth="1px"
      borderRadius="lg"
    >
      <Heading size="md" mb={6}>
        Linen Ops — Staff / Admin
      </Heading>
      {error && (
        <Alert.Root status="error" mb={4} borderRadius="md">
          <Alert.Indicator />
          <Alert.Content>{error}</Alert.Content>
        </Alert.Root>
      )}
      <VStack gap={3} align="stretch">
        {mode === "signup" && (
          <Input
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}
        <Input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {mode === "signup" && (
          <Input
            placeholder="Invite code"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
          />
        )}
        <Button
          colorPalette="teal"
          loading={loading}
          onClick={mode === "signup" ? handleSignUp : handleSignIn}
        >
          {mode === "signup" ? "Join team" : "Sign in"}
        </Button>
        <Text
          fontSize="sm"
          textAlign="center"
          cursor="pointer"
          color="teal.600"
          onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
        >
          {mode === "signup"
            ? "Already have an account? Sign in"
            : "Have an invite code? Join your team"}
        </Text>
      </VStack>
    </Box>
  );
}

export default StaffAuthForm;
