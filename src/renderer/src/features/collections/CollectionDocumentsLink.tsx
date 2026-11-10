import { FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigation } from "../../components/Navigation";

interface CollectionDocumentsLinkProps {
  collectionId: string;
  name: string;
}

/** While filtering by one collection, leads to the documents linked to it. */
export function CollectionDocumentsLink({
  collectionId,
  name,
}: CollectionDocumentsLinkProps) {
  const { showDocuments } = useNavigation();
  const [count, setCount] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    void window.artGallery
      .listLinkedDocuments({ type: "collection", id: collectionId })
      .then((list) => isCurrent && setCount(list.length));
    return () => {
      isCurrent = false;
    };
  }, [collectionId]);

  if (count === 0) return null;
  return (
    <button
      type="button"
      className="collection-documents"
      onClick={() =>
        showDocuments({
          linkedTo: { type: "collection", id: collectionId, label: name },
        })
      }
    >
      <FileText aria-hidden size={14} />
      {count === 1 ? "1 documento" : `${count} documentos`} de «{name}»
    </button>
  );
}
