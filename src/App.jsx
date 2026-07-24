import { useEffect, useState } from "react";
import { Box, Heading, Text, Button, Spinner } from "@chakra-ui/react";
import { supabase } from "./supabaseClient";
import AuthPortal from "./AuthPortal";

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setProfile(null);
      return;
    }
    setProfileLoading(true);
    supabase
      .from("users")
      .select("*")
      .eq("id", session.user.id)
      .single()
      .then(({ data, error }) => {
        if (error) console.error(error);
        else setProfile(data);
        setProfileLoading(false);
      });
  }, [session]);

  if (loading) return <Spinner mt={20} />;
  if (!session) return <AuthPortal onAuthed={setSession} />;
  if (profileLoading || !profile) return <Spinner mt={20} />;

  return (
    <Box p={8}>
      <Heading size="lg">Welcome, {profile.name}</Heading>
      <Text mt={2} color="gray.600">
        Role: {profile.role}
        {profile.department ? ` · ${profile.department}` : ""}
      </Text>
      <Text mt={4} color="gray.500">
        {profile.role === "doctor"
          ? "Ticket request form comes in Lesson 4."
          : "Fulfillment queue comes in Lesson 5."}
      </Text>
      <Button mt={4} onClick={() => supabase.auth.signOut()}>
        Log out
      </Button>
    </Box>
  );
}

export default App;
