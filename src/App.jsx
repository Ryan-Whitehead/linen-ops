import { useEffect, useState } from "react";
import { Box, Heading, Text, Spinner } from "@chakra-ui/react";
import { supabase } from "./supabaseClient";

function App() {
  const [hospital, setHospital] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHospital() {
      const { data, error } = await supabase
        .from("hospitals")
        .select("*")
        .limit(1)
        .single();

      if (error) console.error(error);
      else setHospital(data);
      setLoading(false);
    }
    fetchHospital();
  }, []);

  return (
    <Box p={8}>
      <Heading size="lg" mb={4}>
        Linen Ops
      </Heading>
      {loading ? (
        <Spinner />
      ) : hospital ? (
        <Text>
          Connected! Hospital on file: <b>{hospital.name}</b>
        </Text>
      ) : (
        <Text color="red.500">
          Couldn't reach the database — check your .env.local values.
        </Text>
      )}
    </Box>
  );
}

export default App;
