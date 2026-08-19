import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Heading,
  Text,
  Button,
  Spinner,
  Alert,
  VStack,
} from "@chakra-ui/react";
import { supabase } from "./supabaseClient";
import StaffAuthForm from "./StaffAuthForm";

function ReturnConfirmation() {
  const { token } = useParams();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(null);

  const [ticket, setTicket] = useState(null);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketError, setTicketError] = useState(null);

  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState(null);
  const [confirmed, setConfirmed] = useState(false);

  // Self-contained auth check — a staff member may land here fresh from a
  // QR scan with no prior session, so this page can't assume Home has run.
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

  // Fetch the logged-in user's profile, to confirm they're staff/manager
  // before showing any ticket details.
  useEffect(() => {
    if (!session) {
      setProfile(null);
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
          setProfileError(error);
          setProfile(null);
        } else {
          setProfile(data);
        }
        setProfileLoading(false);
      });
  }, [session]);

  // Once we know the user is staff/manager, look up the ticket by its
  // return_token — this is what the QR code actually encodes.
  useEffect(() => {
    if (!profile || profile.role === "doctor") return;

    setTicketLoading(true);
    setTicketError(null);
    supabase
      .from("tickets")
      .select("*, doctor:doctor_id(name)")
      .eq("return_token", token)
      .single()
      .then(({ data, error }) => {
        if (error) {
          setTicketError(error);
          setTicket(null);
        } else {
          setTicket(data);
        }
        setTicketLoading(false);
      });
  }, [profile, token]);

  async function handleConfirmReturn() {
    setConfirming(true);
    setConfirmError(null);

    // Guard the update with status = 'issued' so a double-scan or a stale
    // page reload can't re-confirm an already-returned ticket.
    const { data, error } = await supabase
      .from("tickets")
      .update({
        status: "returned",
        returned_at: new Date().toISOString(),
        returned_by_staff_id: profile.id,
      })
      .eq("id", ticket.id)
      .eq("status", "issued")
      .select()
      .single();

    setConfirming(false);

    if (error || !data) {
      setConfirmError(
        error?.message ||
          "This ticket may have already been returned or changed status.",
      );
      return;
    }

    setTicket(data);
    setConfirmed(true);
  }

  if (loading) return <Spinner mt={20} />;

  // Not logged in — show the staff login form right on this page, so the
  // person lands back here (still on /return/:token) immediately after
  // authenticating, without a separate redirect step.
  if (!session) {
    return (
      <Box p={8} maxW="420px" mx="auto">
        <Heading size="md" mb={4}>
          Staff login required
        </Heading>
        <Text mb={4} color="gray.600">
          Log in to confirm this coat return.
        </Text>
        <StaffAuthForm onAuthed={setSession} />
      </Box>
    );
  }

  if (profileLoading) return <Spinner mt={20} />;

  if (profileError) {
    return (
      <Box p={8}>
        <Alert.Root status="error" borderRadius="md">
          <Alert.Indicator />
          <Alert.Content>
            Couldn't load your profile: {profileError.message}
          </Alert.Content>
        </Alert.Root>
        <Button mt={4} onClick={() => supabase.auth.signOut()}>
          Log out
        </Button>
      </Box>
    );
  }

  // Doctors don't confirm returns — only staff/manager accounts should
  // reach this point.
  if (profile.role === "doctor") {
    return (
      <Box p={8}>
        <Alert.Root status="warning" borderRadius="md">
          <Alert.Indicator />
          <Alert.Content>
            This page is for linen staff only. Please log in with a staff or
            manager account.
          </Alert.Content>
        </Alert.Root>
        <Button mt={4} onClick={() => supabase.auth.signOut()}>
          Log out
        </Button>
      </Box>
    );
  }

  if (ticketLoading) return <Spinner mt={20} />;

  if (ticketError || !ticket) {
    return (
      <Box p={8}>
        <Alert.Root status="error" borderRadius="md">
          <Alert.Indicator />
          <Alert.Content>
            Couldn't find a ticket for this return code. It may be invalid.
          </Alert.Content>
        </Alert.Root>
      </Box>
    );
  }

  return (
    <Box
      maxW="480px"
      mx="auto"
      mt={12}
      p={8}
      borderWidth="1px"
      borderRadius="lg"
    >
      <Heading size="md" mb={4}>
        Confirm Return — {ticket.display_id}
      </Heading>

      <VStack align="stretch" gap={2} mb={6}>
        <Text>
          <strong>Doctor:</strong> {ticket.doctor?.name ?? "Unknown"}
        </Text>
        <Text>
          <strong>Department:</strong> {ticket.department}
        </Text>
        <Text>
          <strong>Size:</strong> {ticket.size}
        </Text>
        <Text>
          <strong>Quantity:</strong> {ticket.quantity}
        </Text>
        <Text>
          <strong>Status:</strong> {ticket.status}
        </Text>
      </VStack>

      {confirmed || ticket.status === "returned" ? (
        <Alert.Root status="success" borderRadius="md">
          <Alert.Indicator />
          <Alert.Content>
            Return confirmed. This ticket is now closed out.
          </Alert.Content>
        </Alert.Root>
      ) : ticket.status !== "issued" ? (
        <Alert.Root status="warning" borderRadius="md">
          <Alert.Indicator />
          <Alert.Content>
            This ticket is currently '{ticket.status}' and can't be marked
            returned from this state.
          </Alert.Content>
        </Alert.Root>
      ) : (
        <>
          {confirmError && (
            <Alert.Root status="error" mb={3} borderRadius="md">
              <Alert.Indicator />
              <Alert.Content>{confirmError}</Alert.Content>
            </Alert.Root>
          )}
          <Button
            colorPalette="teal"
            loading={confirming}
            onClick={handleConfirmReturn}
            width="100%"
          >
            Confirm Return
          </Button>
        </>
      )}
    </Box>
  );
}

export default ReturnConfirmation;
