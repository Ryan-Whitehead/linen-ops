import { Box, Heading, Text, VStack, Badge } from "@chakra-ui/react";

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
function TicketList({ tickets }) {
  return (
    <Box
      maxW="480px"
      mx="auto"
      mt={8}
      p={6}
      borderWidth="1px"
      borderRadius="lg"
    >
      <Heading size="sm" mb={4}>
        Your Requests
      </Heading>

      {tickets.length === 0 ? (
        <Text color="gray.500" textAlign="center">
          You haven't submitted any requests yet.
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
                {ticket.size} · {ticket.reason.replace("_", " ")} · qty{" "}
                {ticket.quantity}
              </Text>
              <Text fontSize="xs" color="gray.400" mt={1}>
                {new Date(ticket.created_at).toLocaleString()}
              </Text>
            </Box>
          ))}
        </VStack>
      )}
    </Box>
  );
}

export default TicketList;
