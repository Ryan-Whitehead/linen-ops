import { useState } from "react";
import {
  Box,
  Button,
  Input,
  VStack,
  Heading,
  Text,
  NativeSelect,
  Alert,
} from "@chakra-ui/react";
import { supabase } from "./supabaseClient";

function AuthForm({ onAuthed }) {
  const [mode, setMode] = useState("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [department, setDepartment] = useState("");
  const [defaultSize, setDefaultSize] = useState("M");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    setError(null);
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, department, default_size: defaultSize },
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
    setLoading(false);
    if (error) {
      setError(error.message);
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
        Linen Ops — Doctor
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
          <>
            <Input
              placeholder="Department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
            <NativeSelect.Root>
              <NativeSelect.Field
                value={defaultSize}
                onChange={(e) => setDefaultSize(e.target.value)}
              >
                {["XS", "S", "M", "L", "XL", "XXL"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </>
        )}
        <Button
          colorPalette="teal"
          loading={loading}
          onClick={mode === "signup" ? handleSignUp : handleSignIn}
        >
          {mode === "signup" ? "Create account" : "Sign in"}
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
            : "New here? Create an account"}
        </Text>
      </VStack>
    </Box>
  );
}

export default AuthForm;
