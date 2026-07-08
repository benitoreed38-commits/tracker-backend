const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

// Initialize Supabase Connection
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Receives payload from Python Gateway / Master node
app.post('/api/uplink', async (req, res) => {
    // Accepting the backward-mapped fields from bridge.py
    const { zone, worker, rssi, company } = req.body;
    
    if (!zone || !worker) {
        return res.status(400).json({ error: "Missing required telemetry parameters." });
    }

    // Insert directly using your explicit Supabase column layout
    const { data, error } = await supabase
        .from('tracking_logs')
        .insert([{ 
            node_mac: zone, 
            zone_label: zone,          
            beacon_mac: worker, 
            employee_name: worker,     
            rssi: parseInt(rssi),
            company_id: company || 'hotel_alpha'
        }]);

    if (error) {
        console.error("Supabase Write Failure:", error.message);
        return res.status(500).json({ error: error.message });
    }
    
    return res.status(200).json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server executing on port ${PORT}`));