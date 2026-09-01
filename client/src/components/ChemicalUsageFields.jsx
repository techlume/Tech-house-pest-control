export function ChemicalUsageFields({ form, setForm, products }) {
  const product = products.find(item => item._id === form.chemicalProductId);
  return <>
    <label><span>Chemical/product</span><select value={form.chemicalProductId} onChange={event=>setForm({...form,chemicalProductId:event.target.value,chemicalBatchId:'',chemicalQuantity:''})}><option value="">No chemical used</option>{products.map(item=><option key={item._id} value={item._id}>{item.name}</option>)}</select></label>
    <label><span>Batch</span><select disabled={!product} value={form.chemicalBatchId} onChange={event=>setForm({...form,chemicalBatchId:event.target.value})}><option value="">Select batch</option>{product?.batches.map(batch=><option key={batch._id} value={batch._id}>{batch.batchNo} ({batch.quantity} {product.unit})</option>)}</select></label>
    <label><span>Quantity used</span><input disabled={!form.chemicalBatchId} type="number" min="0" step="0.001" value={form.chemicalQuantity} onChange={event=>setForm({...form,chemicalQuantity:event.target.value})}/></label>
  </>;
}
