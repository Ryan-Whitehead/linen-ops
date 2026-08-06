import { useEffect, useState } from "react";
import { Box, Heading, Text, Button, Spinner } from "@chakra-ui/react";
import { supabase } from "./supabaseClient";
import AuthPortal from "./AuthPortal";
import TicketForm from "./TicketForm";

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(null);

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
      setProfileError(null);
      return;
    }
    setProfileLoading(true);
    setProfileError(null);
    supabase
      .from("users")
      .select("*")
      .eq("id", session.user.id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          setProfileError(error);
          setProfile(null);
        } else {
          setProfile(data);
        }
        setProfileLoading(false);
      });
  }, [session]);
  if (loading) return <Spinner mt={20} />;
  if (!session) return <AuthPortal onAuthed={setSession} />;
  if (profileLoading) return <Spinner mt={20} />;

  if (profileError) {
    return (
      <Box p={8}>
        <Heading size="md" color="red.500">
          Couldn't load your profile
        </Heading>
        <Text mt={2} color="gray.600">
          {profileError.message}
        </Text>
        <Button mt={4} onClick={() => supabase.auth.signOut()}>
          Log out
        </Button>
      </Box>
    );
  }

  if (!profile) return <Spinner mt={20} />;

  return (
    <Box p={8}>
      <Heading size="lg">Welcome, {profile.name}</Heading>
      <Text mt={2} color="gray.600">
        Role: {profile.role}
        {profile.department ? ` · ${profile.department}` : ""}
      </Text>

      {profile.role === "doctor" ? (
        <TicketForm profile={profile} />
      ) : (
        <Text mt={4} color="gray.500">
          Fulfillment queue comes in Lesson 5.
        </Text>
      )}

      <Button mt={4} onClick={() => supabase.auth.signOut()}>
        Log out
      </Button>
    </Box>
  );
}
export default App;
