import {
  Box,
  Heading,
  Text,
  VStack,
  Badge,
  Button,
  HStack,
} from "@chakra-ui/react";
import { supabase } from "./supabaseClient";

function statusColor(status) {
  switch (status) {
    case "new":
      return "blue";
    case "in_progress":
      return "yellow";
    case "ready":
      return "purple";
    case "issued":
      return "teal";
    case "returned":
      return "green";
    case "cancelled":
      return "red";
    default:
      return "gray";
  }
}

const NEXT_STATUS = {
  in_progress: "ready",
  ready: "issued",
};

const NEXT_STATUS_LABEL = {
  in_progress: "Mark Ready",
  ready: "Mark Issued",
};

function TicketQueue({ profile, tickets, onChanged }) {
  async function handleClaim(ticket) {
    const { error } = await supabase
      .from("tickets")
      .update({ assigned_staff_id: profile.id, status: "in_progress" })
      .eq("id", ticket.id);

    if (error) {
      console.error(error);
      return;
    }
    onChanged();
  }

  async function handleRelease(ticket) {
    const { error } = await supabase
      .from("tickets")
      .update({ assigned_staff_id: null, status: "new" })
      .eq("id", ticket.id);

    if (error) {
      console.error(error);
      return;
    }
    onChanged();
  }

  async function handleAdvance(ticket) {
    const nextStatus = NEXT_STATUS[ticket.status];
    if (!nextStatus) return;

    const { error } = await supabase
      .from("tickets")
      .update({ status: nextStatus })
      .eq("id", ticket.id);

    if (error) {
      console.error(error);
      return;
    }
    onChanged();
  }

  function renderTicketRow(ticket) {
    const isUnclaimed = !ticket.assigned_staff_id;
    const isMine = ticket.assigned_staff_id === profile.id;

    return (
      <Box key={ticket.id} p={3} borderWidth="1px" borderRadius="md">
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Text fontWeight="bold">{ticket.display_id}</Text>
          <Badge colorPalette={statusColor(ticket.status)}>
            {ticket.status}
          </Badge>
        </Box>

        <Text fontSize="sm" color="gray.600" mt={1}>
          Dr. {ticket.doctor?.name ?? "Unknown"} · {ticket.department} ·{" "}
          {ticket.size} · {ticket.reason.replace("_", " ")} · qty{" "}
          {ticket.quantity}
        </Text>

        <Text fontSize="xs" color="gray.400" mt={1}>
          {new Date(ticket.created_at).toLocaleString()}
        </Text>

        <HStack mt={3} gap={2}>
          {isUnclaimed && (
            <Button
              size="sm"
              colorPalette="teal"
              onClick={() => handleClaim(ticket)}
            >
              Claim & Start
            </Button>
          )}

          {isMine && (
            <>
              {NEXT_STATUS[ticket.status] && (
                <Button
                  size="sm"
                  colorPalette="teal"
                  onClick={() => handleAdvance(ticket)}
                >
                  {NEXT_STATUS_LABEL[ticket.status]}
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRelease(ticket)}
              >
                Release
              </Button>
            </>
          )}

          {!isUnclaimed && !isMine && (
            <Text fontSize="xs" color="gray.500">
              Claimed by another staff member
            </Text>
          )}
        </HStack>
      </Box>
    );
  }

  const myTickets = tickets.filter((t) => t.assigned_staff_id === profile.id);
  const otherTickets = tickets.filter(
    (t) => t.assigned_staff_id !== profile.id,
  );

  return (
    <Box
      maxW="600px"
      mx="auto"
      mt={8}
      p={6}
      borderWidth="1px"
      borderRadius="lg"
    >
      <Heading size="sm" mb={3}>
        My Tickets
      </Heading>
      {myTickets.length === 0 ? (
        <Text color="gray.500" fontSize="sm" mb={6}>
          You haven't claimed any tickets yet.
        </Text>
      ) : (
        <VStack align="stretch" gap={3} mb={6}>
          {myTickets.map(renderTicketRow)}
        </VStack>
      )}

      <Heading size="sm" mb={3}>
        Open Requests
      </Heading>
      {otherTickets.length === 0 ? (
        <Text color="gray.500" fontSize="sm">
          No other requests right now.
        </Text>
      ) : (
        <VStack align="stretch" gap={3}>
          {otherTickets.map(renderTicketRow)}
        </VStack>
      )}
    </Box>
  );
}

export default TicketQueue;
