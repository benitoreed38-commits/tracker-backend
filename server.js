const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

// Initialize Supabase Connection
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Receives payload from master gateway node
app.post('/api/uplink', async (req, res) => {
    // 1. Match what bridge.py is sending
    const { node_mac, beacon_mac, rssi } = req.body; 
    
    // 2. Insert using the exact column names in your tracking_logs SQL table
    const { data, error } = await supabase
        .from('tracking_logs')
        .insert([{ 
            node_mac, 
            beacon_mac, 
            rssi,
            employee_name: beacon_mac, // Using beacon MAC as name temporarily so SQL view doesn't break
            company_id: 'hotel_alpha'   // Matches your anchor node company setting
        }]);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server executing on port ${PORT}`));
});