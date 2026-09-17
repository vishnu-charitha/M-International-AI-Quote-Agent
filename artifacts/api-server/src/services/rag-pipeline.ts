// Simulated Qdrant and Embeddings for Demo purposes without heavy binaries


const COLLECTION_NAME = "docs_collection";
const VECTOR_DIMENSION = 384; // all-MiniLM-L6-v2 dimension

let qdrantClient: any | null = null;
let embedder: any = null;

// Initialize Qdrant and Embedder
export async function initRag() {
  try {
    // Simulated init
    qdrantClient = { mock: true };
    embedder = { mock: true };
    console.log("[RAG] Mock Pipeline initialized successfully.");
  } catch (error) {
    console.error("[RAG] Failed to initialize mock pipeline:", error);
  }
}

// Chunking function that respects section boundaries and overlaps
export function chunkText(text: string, chunkSize: number = 500, overlap: number = 50): string[] {
  const normalized = text.replace(/\n{3,}/g, '\n\n').trim();
  if (!normalized) return [];

  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < normalized.length) {
    let endIndex = startIndex + chunkSize;
    if (endIndex < normalized.length) {
      const nearestNewline = normalized.lastIndexOf('\n', endIndex);
      if (nearestNewline > startIndex + chunkSize / 2) {
        endIndex = nearestNewline;
      } else {
        const nearestSpace = normalized.lastIndexOf(' ', endIndex);
        if (nearestSpace > startIndex + chunkSize / 2) {
          endIndex = nearestSpace;
        }
      }
    }
    const chunk = normalized.slice(startIndex, endIndex).trim();
    if (chunk) {
      if (chunks.length === 0 || chunks[chunks.length - 1] !== chunk) {
        chunks.push(chunk);
      }
    }
    startIndex = endIndex - overlap;
  }
  return chunks;
}

export async function addDocumentToRag(text: string, metadata: any) {
  return true;
}

export async function queryRag(query: string, limit: number = 3) {
  // Mock response for demo
  return [
    { content: "This part is fully compliant with FAA regulations.", metadata: { source: "FAA Guidelines" } },
    { content: "Stock requires 8130-3 certification.", metadata: { source: "Internal Procedures" } }
  ];
}

export async function getRagHealth() {
  return {
    status: 'OK',
    collection: COLLECTION_NAME,
    vectorCount: 15,
    dimension: VECTOR_DIMENSION,
    model: 'Mock-MiniLM'
  };
}
