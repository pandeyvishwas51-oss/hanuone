// Server-rendered e-prescription PDF (NMC 2022 format).
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { RxMed } from "@/lib/compliance";

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 11, fontFamily: "Helvetica", color: "#0E2A33" },
  header: { borderBottom: "2 solid #0F4C5C", paddingBottom: 8, marginBottom: 12 },
  brand: { fontSize: 18, color: "#0F4C5C", fontFamily: "Helvetica-Bold" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between" },
  doctor: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  muted: { color: "#5C6B73", fontSize: 9 },
  section: { marginTop: 12 },
  label: { color: "#5C6B73", fontSize: 8, textTransform: "uppercase", marginBottom: 2 },
  medRow: { flexDirection: "row", borderBottom: "0.5 solid #e5e7eb", paddingVertical: 4 },
  medName: { width: "40%", fontFamily: "Helvetica-Bold" },
  medCol: { width: "20%" },
  rx: { fontSize: 22, color: "#0F4C5C", fontFamily: "Helvetica-Bold", marginBottom: 4 },
  footer: { position: "absolute", bottom: 28, left: 36, right: 36, borderTop: "1 solid #e5e7eb", paddingTop: 8 }
});

export type PrescriptionData = {
  doctorName: string;
  nmcRegNo?: string | null;
  qualification?: string | null;
  practiceAddress?: string | null;
  patientName: string;
  patientAge?: string | null;
  patientSex?: string | null;
  date: string;
  diagnosis?: string | null;
  medications: RxMed[];
  instructions?: string | null;
  validUntil: string;
  rxId: string;
};

export function PrescriptionDoc(d: PrescriptionData) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View style={s.rowBetween}>
            <Text style={s.brand}>HANUone</Text>
            <Text style={s.muted}>e-Prescription · {d.date}</Text>
          </View>
          <Text style={s.muted}>Teleconsultation per NMC Telemedicine Guidelines 2022</Text>
        </View>

        <View style={s.rowBetween}>
          <View style={{ width: "55%" }}>
            <Text style={s.doctor}>{d.doctorName}</Text>
            {d.qualification ? <Text style={s.muted}>{d.qualification}</Text> : null}
            {d.nmcRegNo ? <Text style={s.muted}>NMC Reg. No: {d.nmcRegNo}</Text> : null}
            {d.practiceAddress ? <Text style={s.muted}>{d.practiceAddress}</Text> : null}
          </View>
          <View style={{ width: "40%" }}>
            <Text style={s.label}>Patient</Text>
            <Text>{d.patientName}</Text>
            <Text style={s.muted}>
              {[d.patientAge ? `Age ${d.patientAge}` : null, d.patientSex].filter(Boolean).join(" · ")}
            </Text>
          </View>
        </View>

        {d.diagnosis ? (
          <View style={s.section}>
            <Text style={s.label}>Diagnosis</Text>
            <Text>{d.diagnosis}</Text>
          </View>
        ) : null}

        <View style={s.section}>
          <Text style={s.rx}>Rx</Text>
          <View style={s.medRow}>
            <Text style={[s.medName, s.label]}>Medicine</Text>
            <Text style={[s.medCol, s.label]}>Dosage</Text>
            <Text style={[s.medCol, s.label]}>Frequency</Text>
            <Text style={[s.medCol, s.label]}>Duration</Text>
          </View>
          {d.medications.map((m, i) => (
            <View key={i} style={s.medRow}>
              <Text style={s.medName}>{m.name}</Text>
              <Text style={s.medCol}>{m.dosage ?? "-"}</Text>
              <Text style={s.medCol}>{m.frequency ?? "-"}</Text>
              <Text style={s.medCol}>{m.duration ?? "-"}</Text>
            </View>
          ))}
        </View>

        {d.instructions ? (
          <View style={s.section}>
            <Text style={s.label}>Advice / Instructions</Text>
            <Text>{d.instructions}</Text>
          </View>
        ) : null}

        <View style={s.footer}>
          <View style={s.rowBetween}>
            <Text style={s.muted}>Valid until {d.validUntil} or until dispensed.</Text>
            <Text style={s.muted}>Digitally signed · Rx {d.rxId.slice(0, 8)}</Text>
          </View>
          <Text style={[s.muted, { marginTop: 4 }]}>
            This prescription is generated via Hanuone teleconsultation. Schedule X drugs cannot be
            prescribed via telemedicine.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
