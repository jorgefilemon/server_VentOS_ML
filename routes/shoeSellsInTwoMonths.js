const express = require("express");
const router = express.Router();
const db = require("../database");
const moment = require("moment");

router.get("/", async (req, res) => {
	try {

		const query = `
		SELECT 
        year(fecha) as  'year',  
        MONTH(fecha) as 'month',
        round(SUM(CASE WHEN DAY(fecha) BETWEEN 1  AND 7  THEN CASE WHEN importeCon < 0 THEN cantidad * - 1 ELSE cantidad END ELSE 0 END), 0) AS '1 al 7',
        round(SUM(CASE WHEN DAY(fecha) BETWEEN 8  AND 15 THEN CASE WHEN importeCon < 0 THEN cantidad * - 1 ELSE cantidad END ELSE 0 END), 0) AS '8 al 15',
        round(SUM(CASE WHEN DAY(fecha) BETWEEN 16 AND 22 THEN CASE WHEN importeCon < 0 THEN cantidad * - 1 ELSE cantidad END ELSE 0 END), 0) AS '16 al 22',
        round(SUM(CASE WHEN DAY(fecha) BETWEEN 23 AND 31 THEN CASE WHEN importeCon < 0 THEN cantidad * - 1 ELSE cantidad END ELSE 0 END), 0) AS '23 al fin'
        FROM
            venta
                JOIN
            detallev ON venta.ven_id = detallev.ven_id
                JOIN
            articulo ON detallev.art_id = articulo.art_id
                JOIN
            categoria ON articulo.cat_id = categoria.cat_id
        WHERE
        (
            (YEAR(fecha) = YEAR(CURDATE()) AND MONTH(fecha) = MONTH(CURDATE()))
            OR 
            (YEAR(fecha) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) AND MONTH(fecha) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)))
        
        )
            AND categoria.nombre NOT IN ('vales' , 'acessorios', 'cambio')
            AND venta.status = 1
        GROUP BY YEAR(fecha) , MONTH(fecha)
        ORDER BY YEAR(fecha) asc , MONTH(fecha) asc;
	
      `;
		

		const [rows] = await db.execute(query);
		console.log("Query results:", rows);

        const periodOrder = ['1 al 7','8 al 15','16 al 22', '23 al fin' ]; 

        const transformedData = periodOrder.map(period => {
            const row = { period };
                rows.forEach(item => {
                    if (item.hasOwnProperty(period)) {
                    row[item.month] = item[period];
                } else {
                row[item.month] = null; // Or any fallback value you prefer
                }
            });
            return row;
        });
		// Send the results back to the client
		res.json(transformedData);
	} catch (err) {
		console.error("Error executing query:", err);
		res.status(500).json({ error: "Internal Server Error" });
	}
});

module.exports = router;
