const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Receives payload from master gateway node
app.post('/api/uplink', async (req, res) => {
    // Expected payload format: { node_mac: "74:4R...", beacon_mac: "AA:BB...", rssi: -65 }
    const { node_mac, beacon_mac, rssi } = req.body;
    
    try {
        // 1. Resolve Node MAC to a specific Room/Zone
        let { data: nodeZone } = await supabase
            .from('active_nodes')
            .select('zone_label')
            .eq('node_mac', node_mac)
            .single();

        // 2. Resolve Beacon MAC to an Employee
        let { data: employee } = await supabase
            .from('active_beacons')
            .select('employee_name')
            .eq('beacon_mac', beacon_mac)
            .single();

        // 3. AUTO-ONBOARDING LOGIC: If either device is missing from your system mappings, 
        // silently catch them into an unassigned discovery table for easy dashboard assignment.
        if (!nodeZone) {
            await supabase.from('discovered_nodes_queue').upsert([{ node_mac }], { onConflict: 'node_mac' });
        }
        if (!employee) {
            await supabase.from('discovered_beacons_queue').upsert([{ beacon_mac }], { onConflict: 'beacon_mac' });
        }

        // 4. If both are recognized, save the operational tracking entry
        if (nodeZone && employee) {
            const { error: logError } = await supabase
                .from('tracking_logs')
                .insert([{ 
                    node_mac, 
                    zone_label: nodeZone.zone_label, 
                    beacon_mac, 
                    employee_name: employee.employee_name, 
                    rssi 
                }]);

            if (logError) throw logError;
        }

        return res.status(200).json({ success: true });

    } catch (err) {
        console.error("Uplink processing error:", err.message);
        return res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server executing on port ${PORT}`));