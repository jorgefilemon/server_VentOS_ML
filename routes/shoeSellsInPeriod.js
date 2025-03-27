const express = require("express");
const router = express.Router();
const db = require("../database");
const moment = require("moment");

router.get("/", async (req, res) => {
	try {
		// query just for example.
		const query = `
		SELECT 
		YEAR(fecha),
		MONTH(fecha),
	
		CASE 
			WHEN DAY(CURDATE()) BETWEEN 1 AND 7 THEN '1 al 7'
			WHEN DAY(CURDATE()) BETWEEN 8 AND 15 THEN '8 al 15'
			WHEN DAY(CURDATE()) BETWEEN 16 AND 22 THEN '16 al 22'
			WHEN DAY(CURDATE()) BETWEEN 23 AND 31 THEN '23 al fin'
		END AS 'periodo',
		
	   round( SUM(CASE
			WHEN
				(DAY(CURDATE()) BETWEEN 1 AND 7 AND DAY(fecha) BETWEEN 1 AND 7)
				OR (DAY(CURDATE()) BETWEEN 8 AND 15 AND DAY(fecha) BETWEEN 8 AND 15)
				OR (DAY(CURDATE()) BETWEEN 16 AND 22 AND DAY(fecha) BETWEEN 16 AND 22)
				OR (DAY(CURDATE()) BETWEEN 23 AND 31 AND DAY(fecha) BETWEEN 23 AND 31)
			THEN
				CASE
					WHEN importeCon < 0 THEN cantidad * -1
					ELSE cantidad
				END
			ELSE 0
		END),0 )AS 'total'
	FROM
		venta
			JOIN
		detallev ON venta.ven_id = detallev.ven_id
			JOIN
		articulo ON detallev.art_id = articulo.art_id
			JOIN
		categoria ON articulo.cat_id = categoria.cat_id
	WHERE
		YEAR(fecha) = YEAR(CURDATE())
			AND MONTH(fecha) = MONTH(CURDATE())
			AND categoria.nombre NOT IN ('vales', 'acessorios', 'cambio')
			AND venta.status = 1
	GROUP BY YEAR(fecha), MONTH(fecha), 'periodo'
	
	
      `;
		

		const [rows] = await db.execute(query);
	
		// Send the results back to the client
		res.json(rows);
	} catch (err) {
		console.error("Error executing query:", err);
		res.status(500).json({ error: "Internal Server Error" });
	}
});

module.exports = router;
