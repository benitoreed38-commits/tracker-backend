const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

// Initialize Supabase Connection using environment variables
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// The 4G Board shoots an HTTP POST data packet to this endpoint
app.post('/api/uplink', async (req, res) => {
    const { node_id, worker_id, rssi } = req.body;
    
    const { data, error } = await supabase
        .from('tracking_logs')
        .insert([{ node_id, worker_id, rssi }]);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server executing on port ${PORT}`));