import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
initializeApp({ projectId: "demo-project" });
const db = getFirestore();
db.collection("matchups").where("homeTeam.name", "==", "LA Clippers").get().then(snap => {
  snap.forEach(doc => console.log(doc.data().league, doc.data().status, doc.data().active));
});
