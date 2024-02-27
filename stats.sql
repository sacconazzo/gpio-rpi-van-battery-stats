-- day week
SELECT
	date(timestamp) AS data,
	round(avg(bm_voltage), 2) bmV,
	round(min(bm_voltage), 2) bmVmin,
	round(max(bm_voltage), 2) bmVmax,
	round(avg(b1_voltage), 2) b1V,
	round(min(b1_voltage), 2) b1Vmin,
	round(max(b1_voltage), 2) b1Vmax,
	round(avg(b2_voltage), 2) b2V,
	round(min(b2_voltage), 2) b2Vmin,
	round(max(b2_voltage), 2) b2Vmax,
	round(sum(`b1_current` * `coeff`), 2) AS b1Ah,
	round(sum(`b2_current` * `coeff`), 2) AS b2Ah,
	round(avg(temperature), 1) temp,
	round(min(temperature), 1) tempMin,
	round(max(temperature), 1) tempMax
FROM
	`battery-snaps`
WHERE
	date(timestamp)> (NOW() - INTERVAL 7 DAY)
GROUP BY
	data;

-- realtime
SELECT
	`timestamp`,
	round(bm_voltage, 2) AS bmV,
	round(b1_voltage, 2) AS b1V,
	round(b2_voltage, 2) AS b2V,
	round(`b1_current`, 2) AS b1A,
	round(`b2_current`, 2) AS b2A,
	round(temperature, 1) as temp
FROM
	`battery-snaps`
WHERE
	timestamp> (NOW() - INTERVAL 61 MINUTE)
ORDER BY
	id DESC
LIMIT 500;


-- for testing
SELECT
	date(timestamp) AS data,
	round(avg(bm_voltage), 4) bmV,
	round(avg(b1_voltage), 4) b1V,
	round(avg(b2_voltage), 4) b2V,
	round(avg(`b1_current`), 4) AS b1A,
	round(avg(`b2_current`), 4) AS b2A,
	round(avg(`temperature`), 4) AS temp
FROM
	`battery-snaps`
WHERE
	date(timestamp)> (NOW() - INTERVAL 7 DAY)
GROUP BY
	data;