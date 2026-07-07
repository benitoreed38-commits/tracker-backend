const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL || "https://sixjhxpwkcvnvgiwghrj.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpeGpoeHB3a2N2bnZnaXdnaHJqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjQ3NDU4OCwiZXhwIjoyMDk4MDUwNTg4fQ.m_-qmEChknfBSzxmClfeKvKMirNC9kND7ve1gZwiK6Y"; // Use service role for database execution authority
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Endpoint for the ESP7670E 4G Master Node to batch upload transition states
app.post('/api/telemetry/transition', async (req, res) => {
    const { company_id, node_id, worker_id, event_type } = req.body; 
    // event_type: "ENTER" | "HEARTBEAT"

    if (!company_id || !node_id || !worker_id) {
        return res.status(400).json({ error: "Missing required tracking telemetry parameters." });
    }

    try {
        const timestamp = new Date().toISOString();

        // 1. Log immutable transition trail for tracking_logs (Payroll / Audits)
        const { error: logError } = await supabase
            .from('tracking_logs')
            .insert([{ company_id, node_id, worker_id, event_type, created_at: timestamp }]);

        if (logError) throw logError;

        // 2. Upsert the current live status view cache
        if (event_type === "ENTER" || event_type === "HEARTBEAT") {
            const { error: upsertError } = await supabase
                .from('live_worker_status')
                .upsert({
                    company_id,
                    worker_id,
                    node_id,
                    last_seen: timestamp,
                    time_in_zone: "00:00:00" // Reset or manage via DB triggers/procedures
                }, { onConflict: 'company_id,worker_id' });

            if (upsertError) throw upsertError;
        }

        return res.status(200).json({ success: true, status: "State localized successfully" });
    } catch (err) {
        console.error("Telemetry ingest failure:", err.message);
        return res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`RTLS Engine orchestrating on port ${PORT}`);
});