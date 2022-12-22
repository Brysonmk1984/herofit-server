import app from "./index";
app.listen(process.env.PORT || 3001);

// For some reason, running ts-node in docker container will sometimes cause an error:
// Error: write EPIPE
// This allows child processes to close when that happens
//process.on("SIGTERM", () => process.exit());
