import { useState } from "react";
import { Box, HStack, Button } from "@chakra-ui/react";
import AuthForm from "./AuthForm.jsx";
import StaffAuthForm from "./StaffAuthForm";

function AuthPortal({ onAuthed }) {
  const [portal, setPortal] = useState("doctor");

  return (
    <Box mt={8}>
      <HStack justify="center" gap={2} mb={4}>
        <Button
          size="sm"
          variant={portal === "doctor" ? "solid" : "outline"}
          colorPalette="teal"
          onClick={() => setPortal("doctor")}
        >
          Doctor
        </Button>
        <Button
          size="sm"
          variant={portal === "staff" ? "solid" : "outline"}
          colorPalette="teal"
          onClick={() => setPortal("staff")}
        >
          Staff / Admin
        </Button>
      </HStack>
      {portal === "doctor" ? (
        <AuthForm onAuthed={onAuthed} />
      ) : (
        <StaffAuthForm onAuthed={onAuthed} />
      )}
    </Box>
  );
}

export default AuthPortal;
