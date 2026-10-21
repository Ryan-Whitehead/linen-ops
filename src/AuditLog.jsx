import { useEffect, useState } from "react";
import { Box, Heading, Text, VStack, Spinner, Badge } from "@chakra-ui/react";
import { supabase } from "./supabaseClient";

const EVENT_LABELS = {
  created: "Ticket created",
  status_changed: "Status changed",
  assigned: "Assigned",
  edited: "Edited",
  return_scanned: "Return scanned",
};

const EVENT_COLOR = {
  created: "blue",
  status_changed: "purple",
  assigned: "teal",
  edited: "gray",
  return_scanned: "green",
};

function describeEvent(event) {
  const label = EVENT_LABELS[event.event_type] ?? event.event_type;

  if (
    event.event_type === "status_changed" &&
    event.from_status &&
    event.to_status
  ) {
    return `${label}: ${event.from_status} → ${event.to_status}`;
  }

  return label;
}

function AuditLog({ profile }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    supabase
      .from("ticket_events")
      .select("*, actor:actor_id(name), ticket:ticket_id(display_id)")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          setError(error);
        } else {
          setEvents(data);
        }
        setLoading(false);
      });
    // profile isn't used directly in the query (RLS already scopes results
    // to this staff member's hospital), but re-fetching when profile changes
    // keeps this correct if the logged-in user ever changes.
  }, [profile]);

  if (loading) return <Spinner mt={8} />;

  if (error) {
    return (
      <Text color="red.500" mt={4}>
        Couldn't load the audit log: {error.message}
      </Text>
    );
  }

  return (
    <Box maxW="700px" mx="auto" mt={8}>
      <Heading size="sm" mb={4}>
        Audit Log
      </Heading>

      {events.length === 0 ? (
        <Text color="gray.500" fontSize="sm">
          No activity yet.
        </Text>
      ) : (
        <VStack align="stretch" gap={2}>
          {events.map((event) => (
            <Box key={event.id} p={3} borderWidth="1px" borderRadius="md">
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Text fontWeight="medium">
                  {event.ticket?.display_id ?? "Unknown ticket"}
                </Text>
                <Badge colorPalette={EVENT_COLOR[event.event_type] ?? "gray"}>
                  {describeEvent(event)}
                </Badge>
              </Box>
              <Text fontSize="sm" color="gray.600" mt={1}>
                {event.actor?.name ?? "Unknown"} ·{" "}
                {new Date(event.created_at).toLocaleString()}
              </Text>
            </Box>
          ))}
        </VStack>
      )}
    </Box>
  );
}

export default AuditLog;
