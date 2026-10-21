import { useEffect, useState } from "react";
import { Box, Heading, Text, Button, Spinner, Tabs } from "@chakra-ui/react";
import { supabase } from "./supabaseClient";
import AuthPortal from "./AuthPortal";
import TicketForm from "./TicketForm";
import TicketList from "./TicketList";
import TicketQueue from "./TicketQueue";
import History from "./History";

const ACTIVE_STATUSES = ["new", "in_progress", "ready", "issued"];
const HISTORY_STATUSES = ["returned", "cancelled"];

function Home() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [tickets, setTickets] = useState([]);

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

  function fetchTickets(profile) {
    let query = supabase
      .from("tickets")
      .select("*, doctor:doctor_id(name)")
      .order("created_at", { ascending: false });

    if (profile.role === "doctor") {
      query = query.eq("doctor_id", profile.id);
    }

    query.then(({ data, error }) => {
      if (error) {
        console.error(error);
        return;
      }
      setTickets(data);
    });
  }

  useEffect(() => {
    if (!session) {
      setProfile((prev) => (prev === null ? prev : null));
      setProfileError((prev) => (prev === null ? prev : null));
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
          fetchTickets(data);
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

  const activeTickets = tickets.filter((t) =>
    ACTIVE_STATUSES.includes(t.status),
  );
  const historyTickets = tickets.filter((t) =>
    HISTORY_STATUSES.includes(t.status),
  );

  return (
    <Box p={8}>
      <Heading size="lg">Welcome, {profile.name}</Heading>
      <Text mt={2} color="gray.600">
        Role: {profile.role}
        {profile.department ? ` · ${profile.department}` : ""}
      </Text>

      {profile.role === "doctor" ? (
        <Box mt={6}>
          <TicketForm
            profile={profile}
            onSubmitted={() => fetchTickets(profile)}
          />

          <Tabs.Root defaultValue="my-tickets" mt={6}>
            <Tabs.List>
              <Tabs.Trigger value="my-tickets">My Tickets</Tabs.Trigger>
              <Tabs.Trigger value="history">History</Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content value="my-tickets">
              <TicketList tickets={activeTickets} />
            </Tabs.Content>
            <Tabs.Content value="history">
              <History tickets={historyTickets} />
            </Tabs.Content>
          </Tabs.Root>
        </Box>
      ) : (
        <TicketQueue
          profile={profile}
          tickets={tickets}
          onChanged={() => fetchTickets(profile)}
        />
      )}

      <Button mt={4} onClick={() => supabase.auth.signOut()}>
        Log out
      </Button>
    </Box>
  );
}

export default Home;
