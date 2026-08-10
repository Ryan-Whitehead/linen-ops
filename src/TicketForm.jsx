import { useState } from "react";
import {
  Box,
  Button,
  Input,
  Textarea,
  VStack,
  Heading,
  Alert,
  NativeSelect,
} from "@chakra-ui/react";
import { supabase } from "./supabaseClient";

function TicketForm({ profile, onSubmitted }) {
  const [size, setSize] = useState(profile.default_size || "M");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("routine_swap");
  const [fulfillmentType, setFulfillmentType] = useState("pickup");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [neededBy, setNeededBy] = useState("");
  const [urgency, setUrgency] = useState("routine");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSuccess(false);
    setLoading(true);

    const { error } = await supabase.from("tickets").insert({
      hospital_id: profile.hospital_id,
      doctor_id: profile.id,
      department: profile.department,
      size,
      quantity: Number(quantity),
      reason,
      fulfillment_type: fulfillmentType,
      delivery_location:
        fulfillmentType === "delivery" ? deliveryLocation || null : null,
      needed_by: neededBy || null,
      urgency,
      notes: notes || null,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess(true);
    onSubmitted?.();
    setTimeout(() => setSuccess(false), 3000);

    setSize(profile.default_size || "M");
    setQuantity(1);
    setReason("routine_swap");
    setFulfillmentType("pickup");
    setDeliveryLocation("");
    setNeededBy("");
    setUrgency("routine");
    setNotes("");
  }
  return (
    <Box maxW="480px" mx="auto" mt={8}>
      <Heading size="md" mb={4}>
        Request a Lab Coat
      </Heading>

      {error && (
        <Alert.Root status="error" mb={4} borderRadius="md">
          <Alert.Indicator />
          <Alert.Content>{error}</Alert.Content>
        </Alert.Root>
      )}

      {success && (
        <Alert.Root status="success" mb={4} borderRadius="md">
          <Alert.Indicator />
          <Alert.Content>Ticket Submitted!</Alert.Content>
        </Alert.Root>
      )}

      <VStack gap={3} align="stretch">
        {/* Size */}
        <NativeSelect.Root>
          <NativeSelect.Field
            value={size}
            onChange={(e) => setSize(e.target.value)}
          >
            <option value="XS">XS</option>
            <option value="S">S</option>
            <option value="M">M</option>
            <option value="L">L</option>
            <option value="XL">XL</option>
            <option value="XXL">XXL</option>
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>

        {/* Quantity */}
        <Input
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />

        {/* Reason */}
        <NativeSelect.Root>
          <NativeSelect.Field
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          >
            <option value="routine_swap">Routine swap</option>
            <option value="new_hire">New hire</option>
            <option value="damaged">Damaged</option>
            <option value="lost">Lost</option>
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>

        {/* Fulfillment type */}
        <NativeSelect.Root>
          <NativeSelect.Field
            value={fulfillmentType}
            onChange={(e) => {
              const value = e.target.value;
              setFulfillmentType(value);
              if (value === "pickup") setDeliveryLocation("");
            }}
          >
            <option value="pickup">Pickup</option>
            <option value="delivery">Delivery</option>
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>

        {/* Delivery location - only when delivery is selected */}
        {fulfillmentType === "delivery" && (
          <Input
            placeholder="Delivery location"
            value={deliveryLocation}
            onChange={(e) => setDeliveryLocation(e.target.value)}
          />
        )}

        {/* Needed by */}
        <Input
          type="datetime-local"
          value={neededBy}
          onChange={(e) => setNeededBy(e.target.value)}
        />

        {/* Urgency */}
        <NativeSelect.Root>
          <NativeSelect.Field
            value={urgency}
            onChange={(e) => setUrgency(e.target.value)}
          >
            <option value="routine">Routine</option>
            <option value="today">Today</option>
            <option value="urgent">Urgent</option>
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>

        {/* Notes */}
        <Textarea
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <Button colorPalette="teal" loading={loading} onClick={handleSubmit}>
          Submit Request
        </Button>
      </VStack>
    </Box>
  );
}

export default TicketForm;
