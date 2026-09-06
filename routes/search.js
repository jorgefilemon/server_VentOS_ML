const express = require("express");

const db = require("../database");

const router = express.Router();

router.get("/:searchInfo", async (req, res) => {
	const { searchInfo } = req.params;

const isMercadoLibreSearch = /^m[a-zA-Z]{3}/.test(searchInfo);
const normalizedSearchInfo = isMercadoLibreSearch
	? searchInfo.slice(1)
	: searchInfo;


	try {
		const query = `
      SELECT 
        art_id,
        clave, 
        descripcion, 

        existencia,
        precio1,
        precioCompra,
        
        caracteristicas,
        claveProdServ
        
      FROM articulo

      WHERE status = 1
        and ( descripcion like ?
              OR clave like ?
            )
        limit 1;
      `;

		const [result] = await db.query(query, [
			"%" + normalizedSearchInfo + "%",
			"%" + normalizedSearchInfo + "%",
		]);

    const response = isMercadoLibreSearch
	? result.map((item) => ({
			...item,
			clave: `m${item.clave}`,
	  }))
	: result;
		res.json(response);
		console.log(response);
	} catch (error) {
		res.json("articulo no encontrado");
		console.log(error);
	}
});

module.exports = router;
