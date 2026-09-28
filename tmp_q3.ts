import { pool } from './src/config/database';
(async () => {
  const r = await pool.query('SELECT image_url FROM wms_recognition_cards ORDER BY display_order');
  r.rows.forEach((x: any) => console.log(x.image_url));
  await pool.end();
})();
