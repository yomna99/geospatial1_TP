const express = require('express');
const bodyParser = require('body-parser');
const { Client } = require('pg');
const cors = require('cors');

const app = express();
const port = 3200;
app.use(cors());
app.use(bodyParser.json());

const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'OpenLayersProject',
    password: '0000',
    port: 5432,
});
client.connect();

const setupScript = `
CREATE TABLE IF NOT EXISTS point_shapes (
    id SERIAL PRIMARY KEY,
    feature_type VARCHAR(255),
    geometry GEOMETRY(Point, 4326)
);

CREATE TABLE IF NOT EXISTS line_shapes (
    id SERIAL PRIMARY KEY,
    feature_type VARCHAR(255),
    geometry GEOMETRY(LineString, 4326)
);

CREATE TABLE IF NOT EXISTS polygon_shapes (
    id SERIAL PRIMARY KEY,
    feature_type VARCHAR(255),
    geometry GEOMETRY(Polygon, 4326)
);
`;

// Run the setup script
(async () => {
    try {
        await client.query(setupScript);
        console.log('Database setup successful');
    } catch (err) {
        console.error('Error setting up database:', err);
        client.end();
    }
})();

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
});

app.post('/saveFeature', async (req, res, next) => {
    const { featureType, geometry } = req.body;

    let tableName;
    switch (featureType) {
        case 'point':
            tableName = 'point_shapes';
            break;
        case 'line':
            tableName = 'line_shapes';
            break;
        case 'polygon':
            tableName = 'polygon_shapes';
            break;
        default:
            tableName = 'cv_shapes';
    }

    const query = `
    INSERT INTO ${tableName} (feature_type, geometry)
    VALUES ($1, ST_GeomFromText($2, 4326))
    RETURNING id;
    `;

    try {
        const result = await client.query(query, [featureType, geometry]);
        console.log(`${featureType} feature saved successfully with ID:`, result.rows[0].id);
        res.status(200).json({ id: result.rows[0].id });
    } catch (err) {
        next(err); // Pass the error to the error handling middleware
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
