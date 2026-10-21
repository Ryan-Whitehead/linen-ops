import { Box, Heading, Text, VStack, Badge } from "@chakra-ui/react";

function statusColor(status) {
  switch (status) {
    case "returned":
      return "green";
    case "cancelled":
      return "red";
    default:
      return "gray";
  }
}

function History({ tickets }) {
  return (
    <Box maxW="600px" mx="auto" mt={4}>
      <Heading size="sm" mb={3}>
        History
      </Heading>

      {tickets.length === 0 ? (
        <Text color="gray.500" fontSize="sm">
          No completed or cancelled requests yet.
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
                <Badge colorPalette={statusColor(ticket.status)}>
                  {ticket.status}
                </Badge>
              </Box>

              <Text fontSize="sm" color="gray.600" mt={1}>
                {ticket.department} · {ticket.size} · qty {ticket.quantity}
              </Text>

              <Text fontSize="xs" color="gray.400" mt={1}>
                {ticket.status === "returned" && ticket.returned_at
                  ? `Returned ${new Date(ticket.returned_at).toLocaleString()}`
                  : `Requested ${new Date(ticket.created_at).toLocaleString()}`}
              </Text>
            </Box>
          ))}
        </VStack>
      )}
    </Box>
  );
}

export default History;
