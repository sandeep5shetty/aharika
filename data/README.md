# Food database seed

The agent looks up foods from the **Indian Nutrient Databank (INDB)** table `FoodItem`.

1. Keep `INDB.xlsx` in this folder (same file as `nutrition-chatbot/data/INDB.xlsx`).
2. From the project root, with `POSTGRES_URL` in `.env.local`:

```bash
npm run db:setup
```

That runs Drizzle migrations (empty schema → tables) then imports INDB rows. Optional IFCT data is imported only if the `ifct2017` package is installed.
