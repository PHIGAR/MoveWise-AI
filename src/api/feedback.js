import { handleMoveWiseAIFeedback } from "../../server.mjs";

export default async function handler(request, response) {
    await handleMoveWiseAIFeedback(request, response);
}
