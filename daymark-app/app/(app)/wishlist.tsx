import { useEffect, useRef, useState } from "react";
import { Linking, Text, View } from "react-native";
import { Btn, Card, C, Check, confirmDelete, Empty, FormSheet, Input, Muted, Row, Screen, Seg, s } from "../../src/lib/ui";
import { delWish, money, saveWish, toggleWish, uid, useStore, type Wish } from "../../src/lib/store";
import { filterWishes, pickRandom, pickerPool, wishCategories, wishStats, type WishFilter, type WishSort } from "../../src/lib/logic";
import { haptic } from "../../src/haptics";

const FIELDS = [{ k: "name", label: "Item name", required: true }, { k: "desc", label: "Description", multiline: true },
  { k: "price", label: "Estimated price", numeric: true }, { k: "priority", label: "Priority", options: ["low", "medium", "high"] },
  { k: "url", label: "Product link" }, { k: "category", label: "Category" }, { k: "notes", label: "Notes", multiline: true }];
const BUDGETS: [string, string][] = [["0", "Any budget"], ["200", "≤ 200"], ["500", "≤ 500"], ["1000", "≤ 1,000"], ["2500", "≤ 2,500"]];

export default function Wishlist() {
  const { wishlist, currency } = useStore();
  const [f, setF] = useState<WishFilter>("unpurchased");
  const [sort, setSort] = useState<WishSort>("newest");
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Wish | "new" | null>(null);
  const [budget, setBudget] = useState("0");
  const [pickCat, setPickCat] = useState("all");
  const [shownId, setShownId] = useState<string | null>(null);
  const [spin, setSpin] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const last = useRef<string | null>(null);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const st = wishStats(wishlist);
  const cats = wishCategories(wishlist);
  const m = (n: number) => money(n, currency);
  const list = filterWishes(wishlist, f, sort, q, cat);
  const pool = pickerPool(wishlist, Number(budget), pickCat);

  const pick = () => {
    const final = pickRandom(pool, last.current);
    if (!final) return;
    if (timer.current) clearInterval(timer.current);
    last.current = final.id;
    let i = 0; setSpin(true);
    timer.current = setInterval(() => {
      if (++i > 14 || pool.length === 1) { clearInterval(timer.current!); setShownId(final.id); setSpin(false); haptic.success(); }
      else { setShownId(pool[Math.floor(Math.random() * pool.length)].id); haptic.selection(); }
    }, 80);
  };
  const cur = wishlist.find((w) => w.id === shownId && !w.purchased);
  const empty = !pool.length;
  const emptyMsg = st.remaining === 0 ? "Add an item to use the picker." : "Nothing matches these filters. Widen the budget or category.";

  return (
    <Screen title="Wishlist" sub={`${m(st.remainingCost)} across ${st.remaining} unpurchased`}>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
        <View style={[s.card, { flex: 1 }]}><Text style={{ color: C.tx, fontSize: 22, fontWeight: "600" }}>{st.total}</Text><Muted t="total items" /></View>
        <View style={[s.card, { flex: 1 }]}><Text style={{ color: C.tx, fontSize: 22, fontWeight: "600" }}>{st.remaining}</Text><Muted t="remaining" /></View>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={[s.card, { flex: 1 }]}><Text style={{ color: C.tx, fontSize: 16, fontWeight: "600" }}>{m(st.remainingCost)}</Text><Muted t="still to buy" /></View>
        <View style={[s.card, { flex: 1 }]}><Text style={{ color: C.ac, fontSize: 16, fontWeight: "600" }}>{m(st.acquiredCost)}</Text><Muted t="acquired" /></View>
      </View>

      <View style={[s.card, { alignItems: "center", padding: 22, marginTop: 6 }]}>
        <Muted t="Can’t decide what to buy?" />
        <Seg opts={BUDGETS} value={budget} on={setBudget} />
        {cats.length ? <Seg opts={[["all", "Any category"], ...cats.map((c) => [c, c] as [string, string])]} value={pickCat} on={setPickCat} /> : null}
        <Text style={{ color: C.tx, fontSize: 24, fontWeight: "600", marginTop: 10, minHeight: 34, opacity: spin ? 0.5 : 1, textAlign: "center" }} accessibilityLiveRegion="polite">{cur ? cur.name : ""}</Text>
        <Text style={{ color: C.ac, fontSize: 20, minHeight: 28 }}>{cur && !spin ? m(cur.price) : ""}</Text>
        {cur && !spin ? <Muted t={[cur.category, cur.priority === "high" ? "High priority" : ""].filter(Boolean).join(" · ")} /> : null}
        <Row>
          <Btn label={cur && !spin ? "Pick again" : "Pick for me"} onPress={pick} disabled={empty || spin} />
          {cur && !spin ? <Btn label="Mark acquired" kind="ghost" onPress={() => { toggleWish(cur); setShownId(null); }} /> : null}
          {cur && !spin && cur.url ? <Btn label="Open link" kind="ghost" onPress={() => Linking.openURL(cur.url).catch(() => {})} /> : null}
        </Row>
        {empty ? <Muted t={emptyMsg} /> : null}
      </View>

      <Row><Btn label="Add item" onPress={() => setEdit("new")} /></Row>
      <Seg opts={[["all", "All"], ["unpurchased", "To buy"], ["purchased", "Purchased"]]} value={f} on={setF} />
      <Seg opts={[["newest", "Newest"], ["price-asc", "Price ↑"], ["price-desc", "Price ↓"], ["priority", "Priority"], ["alpha", "A–Z"]]} value={sort} on={setSort} />
      {cats.length ? <Seg opts={[["all", "All categories"], ...cats.map((c) => [c, c] as [string, string])]} value={cat} on={setCat} /> : null}
      <Input placeholder="Search wishlist" value={q} onChangeText={setQ} />
      <View style={{ marginTop: 10 }}>
        {list.length ? list.map((w) => (
          <Card key={w.id} done={w.purchased} accent={!w.purchased && w.priority === "high" ? C.ac : undefined}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Check on={w.purchased} label={`${w.purchased ? "Restore" : "Mark purchased"} ${w.name}`} onPress={() => toggleWish(w)} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.tx }}>{w.name}</Text>{w.desc ? <Muted t={w.desc} /> : null}
                <Muted t={[m(w.price), w.category, w.priority !== "medium" ? w.priority + " priority" : ""].filter(Boolean).join(" · ")} />
                {w.notes ? <Muted t={`Note: ${w.notes}`} /> : null}
                {w.url ? <Text style={{ color: C.ac, fontSize: 13 }} onPress={() => Linking.openURL(w.url).catch(() => {})}>Open link</Text> : null}
                <Row><Btn label="Edit" kind="ghost" onPress={() => setEdit(w)} /><Btn label="Delete" kind="bad" onPress={() => confirmDelete(w.name, () => delWish(w.id))} /></Row>
              </View>
            </View>
          </Card>
        )) : <Empty t="Nothing here" sub={f === "purchased" ? "Purchased items appear here. Tap the circle to restore one." : "Save things you plan to buy."} />}
      </View>
      {edit ? <FormSheet title={edit === "new" ? "New item" : "Edit item"} fields={FIELDS}
        initial={edit === "new" ? { priority: "medium" } : { ...edit, price: String(edit.price || "") } as any}
        onClose={() => setEdit(null)}
        validate={(v) => (v.price && (isNaN(parseFloat(v.price)) || parseFloat(v.price) < 0) ? "Price must be a positive number." : "")}
        onSave={(v) => {
          const url = v.url?.trim() ? (/^https?:\/\//i.test(v.url.trim()) ? v.url.trim() : "https://" + v.url.trim()) : "";
          const base = edit === "new" ? { id: uid(), purchased: false, purchasedAt: null, createdAt: Date.now() } : edit;
          saveWish({ ...base, name: v.name.trim(), desc: v.desc ?? "", notes: v.notes ?? "", price: v.price ? parseFloat(v.price) : 0, priority: (v.priority as Wish["priority"]) ?? "medium", url, category: (v.category ?? "").trim() });
          setEdit(null);
        }} /> : null}
    </Screen>
  );
}
