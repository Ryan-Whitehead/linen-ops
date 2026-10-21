import { useEffect, useState } from "react";
import { Box, Heading, Text, VStack, Spinner, Badge } from "@chakra-ui/react";
import { supabase } from "./supabaseClient";

function Returns({ profile }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    supabase
      .from("tickets")
      .select(
        "*, doctor:doctor_id(name), returned_by:returned_by_staff_id(name)",
      )
      .eq("status", "returned")
      .order("returned_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          setError(error);
        } else {
          setTickets(data);
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
        Couldn't load returns: {error.message}
      </Text>
    );
  }

  return (
    <Box maxW="700px" mx="auto" mt={8}>
      <Heading size="sm" mb={4}>
        Returns
      </Heading>

      {tickets.length === 0 ? (
        <Text color="gray.500" fontSize="sm">
          No returned tickets yet.
        </Text>
      ) : (
        <VStack align="stretch" gap={3}>
          {tickets.map((ticket) => (
            <Box key={ticket.id} p={3} borderWidth="1px" borderRadius="md">
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Text fontWeight="bold">{ticket.display_id}</Text>
                <Badge colorPalette="green">returned</Badge>
              </Box>

              <Text fontSize="sm" color="gray.600" mt={1}>
                Dr. {ticket.doctor?.name ?? "Unknown"} · {ticket.department} ·{" "}
                {ticket.size} · qty {ticket.quantity}
              </Text>

              <Text fontSize="xs" color="gray.500" mt={1}>
                Returned{" "}
                {ticket.returned_at
                  ? new Date(ticket.returned_at).toLocaleString()
                  : "—"}{" "}
                by {ticket.returned_by?.name ?? "Unknown"}
              </Text>
            </Box>
          ))}
        </VStack>
      )}
    </Box>
  );
}

export default Returns;
