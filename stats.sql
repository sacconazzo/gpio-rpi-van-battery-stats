-- day week
SELECT
	date(timestamp) AS data,
	round(avg(bm_voltage), 4) bm_V,
	round(avg(b1_voltage), 4) b1_V,
	round(avg(b2_voltage), 4) b2_V,
	round(sum(`b1_current` * `coeff`), 4) AS b1_Ah,
	round(sum(`b2_current` * `coeff`), 4) AS b2_Ah
FROM
	`battery-snaps`
WHERE
	date(timestamp)> (NOW() - INTERVAL 7 DAY)
GROUP BY
	data;

-- realtime
SELECT
	`timestamp`,
	round(bm_voltage, 3) AS bm_V,
	round(b1_voltage, 3) AS b1_V,
	round(b2_voltage, 3) AS b2_V,
	round(`b1_current`, 3) AS b1_A,
	round(`b2_current`, 3) AS b2_A
FROM
	`battery-snaps`
WHERE
	timestamp> (NOW() - INTERVAL 61 MINUTE)
ORDER BY
	id DESC
LIMIT 500;