import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts'
import { UploadCloud } from 'lucide-react'

// UI Primitives
import LoadingSpinner from '@/components/ui/LoadingSpinner'

// Scoped Leaf components
import FineTuningPanel from '@/components/leaf/FineTuningPanel'

// Scoped Leaf APIs
import {
  getDashboardStats,
  prepareBatch,
  getBatches,
  getBatch,
  exportBatch,
  uploadCandidateModel,
  getCandidateModels,
  getDeployedModel,
} from '@/lib/leafApi'
import type { DashboardStats, Batch, CandidateModel } from '@/lib/leafApi'

import '@/components/leaf/leafStyles.css'

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [batches, setBatches] = useState<Batch[]>([])
  const [selectedBatch, setSelectedBatch] = useState<any>(null)
  const [error, setError] = useState('')
  const [warningModalOpen, setWarningModalOpen] = useState(false)
  const [deployedModel, setDeployedModel] = useState<any>(null)
  const [isPreparingBatch, setIsPreparingBatch] = useState(false)
  const [isExportingBatch, setIsExportingBatch] = useState(false)
  const [loading, setLoading] = useState(true)

  // Candidate evaluation states
  const [candidates, setCandidates] = useState<CandidateModel[]>([])
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateModel | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [testAccuracy, setTestAccuracy] = useState('')
  const [macroF1, setMacroF1] = useState('')
  const [sourceBatchId, setSourceBatchId] = useState('')
  const [notes, setNotes] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const st = await getDashboardStats()
      setStats(st)
      const bs = await getBatches()
      setBatches(bs)
      
      // Load candidate models with error fallback
      try {
        const cs = await getCandidateModels()
        setCandidates(cs)
        if (cs.length > 0) {
          setSelectedCandidate(cs[0])
        }
      } catch {
        console.warn('Candidate models endpoint not fully accessible via Gateway')
      }

      // Load deployed model with error fallback
      try {
        const dm = await getDeployedModel()
        setDeployedModel(dm)
      } catch {
        console.warn('Deployed model endpoint not fully accessible via Gateway')
      }
    } catch {
      setError('Failed to load dashboard statistics')
    } finally {
      setLoading(false)
    }
  }

  async function handlePrepareClick() {
    if (stats && stats.active_learning_eligible_samples < 100) {
      setWarningModalOpen(true)
    } else {
      executePrepare()
    }
  }

  async function executePrepare() {
    setWarningModalOpen(false)
    setIsPreparingBatch(true)
    try {
      await prepareBatch()
      toast.success('Batch prepared successfully')
      await loadData()
    } catch (err: any) {
      if (err.response?.status === 400) {
        toast.error(err.response?.data?.detail || 'No eligible verified samples are currently available for a new Active Learning batch.')
      } else {
        toast.error(err.response?.data?.detail || 'Failed to prepare batch')
      }
    } finally {
      setIsPreparingBatch(false)
    }
  }

  async function viewBatch(batchId: string) {
    try {
      const data = await getBatch(batchId)
      setSelectedBatch(data)
    } catch {
      toast.error('Failed to load batch details')
    }
  }

  async function handleExportClick() {
    if (!selectedBatch) return
    setIsExportingBatch(true)
    try {
      const blob = await exportBatch(selectedBatch.batch.batch_id)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `PaddyGuard_AL_BATCH_${selectedBatch.batch.batch_id}.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success('Zip archive downloaded')
      await viewBatch(selectedBatch.batch.batch_id)
      loadData()
    } catch (err: any) {
      if (err.response?.status === 404) {
        toast.error('Export endpoint is not declared on the Gateway. Batch zip must be generated offline.')
      } else {
        toast.error('Failed to export batch archive')
      }
    } finally {
      setIsExportingBatch(false)
    }
  }

  async function handleUploadSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) {
      setUploadError('Please select a .pth model file.')
      return
    }
    if (!testAccuracy || !macroF1) {
      setUploadError('Please fill in both Accuracy and Macro F1.')
      return
    }

    setIsUploading(true)
    setUploadError('')
    setUploadSuccess('')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('test_accuracy', testAccuracy)
    formData.append('macro_f1', macroF1)
    formData.append('source_batch_id', sourceBatchId)
    formData.append('notes', notes)

    try {
      const res = await uploadCandidateModel(formData)
      setUploadSuccess(`Successfully uploaded and validated ${res.filename}! Decision: ${res.decision}`)
      setFile(null)
      
      const fileInput = document.getElementById('candidate-file-input') as HTMLInputElement
      if (fileInput) fileInput.value = ''
      
      setTestAccuracy('')
      setMacroF1('')
      setSourceBatchId('')
      setNotes('')
      
      const cs = await getCandidateModels()
      setCandidates(cs)
      const uploaded = cs.find((c) => c.filename === res.filename)
      if (uploaded) {
        setSelectedCandidate(uploaded)
      } else if (cs.length > 0) {
        setSelectedCandidate(cs[0])
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        setUploadError('Upload API route is not declared on the Gateway. Candidates must be registered directly in database.')
      } else {
        setUploadError(err.response?.data?.detail || err.message || 'Failed to upload candidate model.')
      }
    } finally {
      setIsUploading(false)
    }
  }

  if (loading) return <LoadingSpinner labelEn="Loading research dashboard..." />

  return (
    <div className="leaf-module space-y-6">
      {/* 1. Experiment Overview */}
      <section className="card space-y-6">
        <div>
          <h2 className="text-xl font-bold text-forest mb-1" style={{ margin: 0 }}>Research Experiment Results</h2>
          <p className="text-sm text-forest-muted">
            Research dashboard — shows controlled Active Learning experiment results and live verified samples collected for future retraining.
          </p>
        </div>

        <div className="rounded-xl border border-forest/10 bg-forest/5 p-4 text-xs space-y-1">
          <p className="text-forest font-semibold">
            Selection Policy:
          </p>
          <p className="text-forest-muted">
            Expert review candidates are selected using a hybrid uncertainty strategy: all valid predictions below 50% confidence plus the five lowest-confidence pending predictions. Model retraining is performed offline in controlled experiments. Expert verification does not automatically update the deployed model.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-beige p-4 bg-beige/10 space-y-2">
            <h3 className="font-bold text-forest text-sm">Current Deployed Model</h3>
            <div className="text-sm text-forest space-y-1">
              <p><strong>Checkpoint:</strong> {deployedModel?.checkpoint || 'PaddyGuard_active_learning_round2.pth'}</p>
              <p><strong>Architecture:</strong> EfficientNetB3</p>
              <p><strong>Test Accuracy:</strong> {deployedModel?.test_accuracy ? `${(deployedModel.test_accuracy * 100).toFixed(2)}%` : '97.14%'}</p>
              <p><strong>Macro F1:</strong> {deployedModel?.macro_f1 ? deployedModel.macro_f1.toFixed(4) : '0.9714'}</p>
              <p><strong>Training labels:</strong> 2300</p>
              <p><strong>Classes:</strong> 4</p>
            </div>
            <p className="text-[11px] text-forest-muted pt-2 border-t border-beige/60">
              The deployed checkpoint was selected from the Active Learning experiment because Round 2 achieved the highest held-out test performance.
            </p>
          </div>

          <div className="rounded-xl border border-beige p-4 bg-white space-y-2">
            <h3 className="font-bold text-forest text-sm">Key Findings</h3>
            <div className="text-sm text-forest space-y-1">
              <p><strong>Same annotation budget (2300 labels):</strong></p>
              <ul className="list-disc pl-5 text-xs text-forest-muted space-y-0.5">
                <li>Active Learning: 97.14%</li>
                <li>Random Sampling: 96.66%</li>
              </ul>
              <p>Difference: <strong>+0.48</strong> percentage points in this experiment.</p>
              <p className="pt-2 border-t border-beige/60"><strong>Overall Improvement:</strong></p>
              <p className="text-xs">Baseline (95.70%) → Best Active Learning (97.14%) (+1.44 percentage points)</p>
            </div>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Experiment Phase</th>
                <th>Labels</th>
                <th>Accuracy</th>
                <th>Macro F1</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Baseline</td>
                <td>2100</td>
                <td>95.70%</td>
                <td>0.9568</td>
              </tr>
              <tr>
                <td>Active Learning +100</td>
                <td>2200</td>
                <td>96.90%</td>
                <td>0.9689</td>
              </tr>
              <tr>
                <td>Random +100</td>
                <td>2200</td>
                <td>96.54%</td>
                <td>0.9652</td>
              </tr>
              <tr style={{ background: '#f0fff4', fontWeight: 'bold' }}>
                <td>Active Learning +200 (Deployed)</td>
                <td>2300</td>
                <td>97.14%</td>
                <td>0.9714</td>
              </tr>
              <tr>
                <td>Random +200</td>
                <td>2300</td>
                <td>96.66%</td>
                <td>0.9664</td>
              </tr>
              <tr>
                <td>Active Learning +300</td>
                <td>2400</td>
                <td>96.90%</td>
                <td>0.9690</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 2. Active Learning Metrics */}
      <section className="card space-y-6">
        <div>
          <h2 className="text-xl font-bold text-forest mb-1" style={{ margin: 0 }}>Live Active Learning Data</h2>
          <p className="text-xs text-forest-muted">
            Telemetry metrics of the live expert review process.
          </p>
        </div>

        {error && <p className="error">{error}</p>}
        {stats && (
          <div className="space-y-6">
            <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
              <div className="rounded-xl border border-beige bg-beige/10 p-3">
                <span className="text-[10px] text-forest-muted uppercase tracking-wider block">Pending Reviews</span>
                <strong className="text-2xl text-forest block mt-1">{stats.pending_expert_reviews}</strong>
              </div>
              <div className="rounded-xl border border-beige bg-beige/10 p-3">
                <span className="text-[10px] text-forest-muted uppercase tracking-wider block">Verified Samples</span>
                <strong className="text-2xl text-forest block mt-1">{stats.verified_expert_samples}</strong>
              </div>
              <div className="rounded-xl border border-beige bg-beige/10 p-3">
                <span className="text-[10px] text-forest-muted uppercase tracking-wider block">Approved for Training</span>
                <strong className="text-2xl text-forest block mt-1">{stats.approved_for_training_samples}</strong>
              </div>
              <div className="rounded-xl border border-beige bg-beige/10 p-3">
                <span className="text-[10px] text-forest-muted uppercase tracking-wider block">Available / Unused</span>
                <strong className="text-2xl text-forest block mt-1">{stats.active_learning_eligible_samples}</strong>
              </div>
              <div className="rounded-xl border border-beige bg-beige/10 p-3">
                <span className="text-[10px] text-forest-muted uppercase tracking-wider block">Consumed / Used</span>
                <strong className="text-2xl text-forest block mt-1">{stats.consumed_training_samples}</strong>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: 'Pending Review', count: stats.pending_expert_reviews },
                    { name: 'Verified', count: stats.verified_expert_samples },
                    { name: 'Approved', count: stats.approved_for_training_samples },
                    { name: 'Available', count: stats.active_learning_eligible_samples },
                    { name: 'Consumed', count: stats.consumed_training_samples },
                    { name: 'Active Models', count: stats.storage_summary?.active_models || 0 },
                    { name: 'Backups Kept', count: stats.storage_summary?.backups_kept || 0 },
                    { name: 'Rejected Kept', count: stats.storage_summary?.rejected_candidates_kept || 0 },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#4a5568', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: '#4a5568', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#f4f8f5' }} contentStyle={{ borderRadius: '8px', border: '1px solid #dfece3' }} />
                  <Bar dataKey="count" fill="#2c7a7b" radius={[4, 4, 0, 0]} barSize={35} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-xl border border-beige bg-beige/10 p-5 space-y-3">
              <h3 className="font-bold text-forest text-sm">Prepare Next Active Learning Batch</h3>
              <p className="text-xs text-forest-muted">
                <strong>Research recommendation:</strong> Wait until at least 100 expert-verified samples are collected before starting the next controlled retraining round.
              </p>
              <div className="text-sm font-semibold text-forest flex flex-wrap gap-x-6 gap-y-1">
                <span>Available verified samples: <strong className="text-forest">{stats.active_learning_eligible_samples}</strong></span>
                <span>Mode: <strong>{stats.active_learning_eligible_samples < 100 ? 'DEMO' : 'CONTROLLED'}</strong></span>
              </div>
              
              {stats.active_learning_eligible_samples > 0 ? (
                <button
                  onClick={handlePrepareClick}
                  disabled={isPreparingBatch}
                  className="primary-submit-btn w-auto"
                  style={{ width: 'auto', padding: '10px 20px', fontSize: '0.85rem' }}
                >
                  {isPreparingBatch ? 'Preparing Batch...' : 'Prepare Next Batch'}
                </button>
              ) : (
                <button disabled className="btn-secondary" style={{ cursor: 'not-allowed', width: 'auto' }}>
                  No expert-verified samples available
                </button>
              )}
            </div>

            {/* Prepared Batches List */}
            {batches.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-bold text-forest text-sm">Prepared Batches</h3>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Batch ID</th>
                        <th>Created At</th>
                        <th>Samples</th>
                        <th>Status</th>
                        <th>Mode</th>
                        <th className="text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batches.map((b) => (
                        <tr key={b.batch_id} style={{ background: selectedBatch?.batch?.batch_id === b.batch_id ? '#f4fbf6' : 'none' }}>
                          <td className="font-mono text-xs text-forest-muted">{b.batch_id}</td>
                          <td className="text-xs text-forest-muted">{new Date(b.created_at).toLocaleString()}</td>
                          <td className="text-xs text-forest">{b.sample_count}</td>
                          <td className="font-semibold text-xs text-forest">{b.status}</td>
                          <td className="text-xs font-semibold">
                            {b.is_demo_mode ? <span className="text-amber">DEMO</span> : <span className="text-forest">RESEARCH</span>}
                          </td>
                          <td className="text-right">
                            <button
                              onClick={() => viewBatch(b.batch_id)}
                              className="primary-btn text-xs py-1 px-2.5 rounded-lg"
                              style={{ width: 'auto', padding: '4px 10px', fontSize: '0.8rem' }}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 3. Selected Batch Details */}
      {selectedBatch && (
        <section className="card space-y-6 animate-entrance">
          <div>
            <h2 className="text-xl font-bold text-forest mb-1" style={{ margin: 0 }}>Batch Details</h2>
            <p className="text-xs text-forest-muted">
              Batch metadata and verification checklist.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 text-sm text-forest">
            <div className="space-y-1">
              <p><strong>Batch ID:</strong> <span className="font-mono text-xs text-forest-light">{selectedBatch.batch.batch_id}</span></p>
              <p><strong>Verified Samples:</strong> {selectedBatch.batch.sample_count}</p>
              <p><strong>Recommended Samples:</strong> {selectedBatch.batch.recommended_batch_size}</p>
              <p><strong>Status:</strong> {selectedBatch.batch.status}</p>
            </div>
            <div
              className="rounded-xl border p-4"
              style={{
                background: selectedBatch.batch.is_demo_mode ? '#fffaf0' : '#f0fff4',
                borderColor: selectedBatch.batch.is_demo_mode ? '#feebc8' : '#c6f6d5',
              }}
            >
              {selectedBatch.batch.is_demo_mode ? (
                <>
                  <h4 className="font-bold text-amber mb-1">DEMO MODE</h4>
                  <p className="text-xs text-amber-700">This batch is below the recommended research batch size.</p>
                </>
              ) : (
                <>
                  <h4 className="font-bold text-forest mb-1">CONTROLLED RETRAINING BATCH READY</h4>
                  <p className="text-xs text-forest-muted">Retraining batch meets all research sizing requirements.</p>
                </>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-forest text-sm">Batch Samples</h3>
            <div className="table-wrap" style={{ maxHeight: '240px', overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Case ID</th>
                    <th>AI Prediction</th>
                    <th>Confidence</th>
                    <th>Expert Label</th>
                    <th>Selection Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedBatch.samples.map((s: any) => (
                    <tr key={s.case_id}>
                      <td className="font-mono text-xs text-forest-muted">{s.case_id}</td>
                      <td className="text-xs text-forest">{s.predicted_disease?.replace(/_/g, ' ')}</td>
                      <td className="text-xs text-forest">{(s.confidence * 100).toFixed(2)}%</td>
                      <td className="text-xs font-bold text-forest-light">{s.expert_validated_disease?.replace(/_/g, ' ')}</td>
                      <td className="text-xs text-forest-muted">{s.review_reason?.replace(/_/g, ' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {selectedBatch.batch.status === 'READY' && (
            <div className="rounded-xl border border-beige bg-beige/10 p-5 space-y-4">
              <h3 className="font-bold text-forest text-sm">retraining &amp; Offline Export</h3>
              <p className="text-xs text-forest-muted">
                Exports expert-verified samples and original images for controlled offline retraining. Deployed model remains unchanged until a candidate is promoted.
              </p>
              
              {selectedBatch.batch.is_demo_mode && (
                <div className="rounded-xl bg-amber/5 border border-amber/20 p-3 text-xs text-amber-700">
                  <strong>Prototype Demonstration Mode:</strong> Demo batches may contain fewer than 100 samples. Exporting demonstrates the pipeline but does not make them equivalent to a controlled research round.
                </div>
              )}

              <button
                onClick={handleExportClick}
                disabled={isExportingBatch}
                className="primary-submit-btn w-auto"
                style={{ width: 'auto', padding: '10px 20px', background: '#2c7a7b' }}
              >
                {isExportingBatch ? 'Exporting Batch...' : 'Export Batch for Colab'}
              </button>
              
              {selectedBatch.batch.export_count > 0 && (
                <div className="text-xs text-forest font-semibold mt-2">
                  ✓ Exported for Colab ({new Date(selectedBatch.batch.exported_at).toLocaleString()})
                </div>
              )}
            </div>
          )}

          {/* Workflow Retraining Steps */}
          <div className="space-y-4 border-t border-beige/60 pt-4">
            <h3 className="font-bold text-forest text-sm">Retraining Workflow Tracker</h3>
            <p className="text-xs text-forest-muted">
              Retraining and validation are conducted offline. Deployed model: <strong>{deployedModel?.checkpoint || 'PaddyGuard_active_learning_round2.pth'}</strong>.
            </p>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center bg-forest/5 p-3 rounded-lg border-l-4 border-forest">
                <span><strong>Step 1 — Collect Expert-Verified Samples</strong></span>
                <span className="font-bold text-forest">✓ COMPLETED</span>
              </div>
              <div className="flex justify-between items-center bg-forest/5 p-3 rounded-lg border-l-4 border-forest">
                <span><strong>Step 2 — Validate Labels and Images</strong></span>
                <span className="font-bold text-forest">✓ COMPLETED</span>
              </div>
              <div className="flex justify-between items-center bg-forest/5 p-3 rounded-lg border-l-4 border-forest">
                <span><strong>Step 3 — Create Active Learning Batch</strong></span>
                <span className="font-bold text-forest">✓ COMPLETED</span>
              </div>
              <div
                className="flex justify-between items-center p-3 rounded-lg border-l-4"
                style={{
                  background: selectedBatch.batch.export_count > 0 ? '#f0fff4' : '#fffaf0',
                  borderLeftColor: selectedBatch.batch.export_count > 0 ? '#38a169' : '#d9a521',
                }}
              >
                <span><strong>Step 4 — Export Batch for Offline Retraining</strong></span>
                <span className="font-bold" style={{ color: selectedBatch.batch.export_count > 0 ? '#2f855a' : '#d9a521' }}>
                  {selectedBatch.batch.export_count > 0 ? '✓ EXPORTED' : 'READY'}
                </span>
              </div>
              <div className="flex justify-between items-center bg-beige/10 p-3 rounded-lg border-l-4 border-beige/60">
                <span><strong>Step 5 — Candidate Model Retraining</strong></span>
                <span className="text-forest-muted font-semibold">OFFLINE — NOT EXECUTED BY WEB APP</span>
              </div>
              <div className="flex justify-between items-center bg-beige/10 p-3 rounded-lg border-l-4 border-beige/60">
                <span><strong>Step 6 — Held-Out Evaluation & Candidate Comparison</strong></span>
                <span className="text-forest-muted font-semibold">OFFLINE — REQUIRES CANDIDATE MODEL</span>
              </div>
              <div className="flex justify-between items-center bg-beige/10 p-3 rounded-lg border-l-4 border-beige/60">
                <span><strong>Step 7 — Deployment Approval</strong></span>
                <span className="text-forest-light font-bold">WAITING</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 4. Candidate Model Evaluation */}
      <section className="card space-y-6">
        <div>
          <h2 className="text-xl font-bold text-forest mb-1" style={{ margin: 0 }}>Candidate Model Evaluation</h2>
          <p className="text-xs text-forest-muted">
            Upload and evaluate candidate model checkpoints against the deployed Round 2 baseline.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Upload Form */}
          <div className="rounded-xl border border-beige bg-beige/10 p-5 space-y-4">
            <h3 className="font-bold text-forest text-sm flex items-center gap-1">
              <UploadCloud className="h-4 w-4 text-amber" /> Upload Evaluated Checkpoint
            </h3>
            {uploadError && <div className="rounded-lg bg-red-50 text-red-700 p-2.5 text-xs font-semibold">{uploadError}</div>}
            {uploadSuccess && <div className="rounded-lg bg-green-50 text-green-700 p-2.5 text-xs font-semibold">{uploadSuccess}</div>}

            <form onSubmit={handleUploadSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold block mb-1">Candidate file (.pth)</label>
                <input
                  id="candidate-file-input"
                  type="file"
                  accept=".pth"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="bg-white border border-beige"
                  style={{ padding: '8px' }}
                />
              </div>

              <div className="grid gap-3 grid-cols-2">
                <div>
                  <label className="text-xs font-semibold block mb-1">Test Accuracy (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 96.66"
                    value={testAccuracy}
                    onChange={(e) => setTestAccuracy(e.target.value)}
                    style={{ padding: '8px' }}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1">Macro F1</label>
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="e.g. 0.9665"
                    value={macroF1}
                    onChange={(e) => setMacroF1(e.target.value)}
                    style={{ padding: '8px' }}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">Source Batch ID</label>
                <input
                  type="text"
                  placeholder="e.g. AL-BATCH-..."
                  value={sourceBatchId}
                  onChange={(e) => setSourceBatchId(e.target.value)}
                  style={{ padding: '8px' }}
                />
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">Notes</label>
                <textarea
                  placeholder="Notes on retrained candidate..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ padding: '8px', height: '60px' }}
                />
              </div>

              <button
                type="submit"
                disabled={isUploading}
                className="primary-submit-btn w-full mt-2"
              >
                {isUploading ? 'Uploading Checkpoint...' : 'Upload & Validate'}
              </button>
            </form>
          </div>

          {/* Model Comparison Graph */}
          <div className="rounded-xl border border-beige bg-white p-5 space-y-4">
            <h3 className="font-bold text-forest text-sm">Model Comparison</h3>
            {selectedCandidate ? (
              <div className="space-y-4">
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        {
                          name: 'Accuracy (%)',
                          Current: (deployedModel?.test_accuracy || 0.9714) * 100,
                          Candidate: selectedCandidate.test_accuracy * 100,
                        },
                        {
                          name: 'Macro F1 (x100)',
                          Current: (deployedModel?.macro_f1 || 0.9714) * 100,
                          Candidate: selectedCandidate.macro_f1 * 100,
                        },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: '#4a5568', fontSize: 10 }} />
                      <YAxis domain={[90, 100]} allowDecimals={false} tick={{ fill: '#4a5568', fontSize: 10 }} />
                      <Tooltip formatter={(value: number) => value.toFixed(2)} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                      <Bar dataKey="Current" fill="#a0aec0" barSize={25} />
                      <Bar
                        dataKey="Candidate"
                        fill={selectedCandidate.status === 'ELIGIBLE_FOR_REVIEW' ? '#38a169' : '#e53e3e'}
                        barSize={25}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-beige/10 rounded-lg p-3 text-xs text-forest space-y-1.5 border border-beige/60">
                  <h4 className="font-bold text-forest-muted">Performance Deltas</h4>
                  <p>
                    Accuracy Change:{' '}
                    <span
                      className={
                        selectedCandidate.test_accuracy - (deployedModel?.test_accuracy || 0.9714) > 0
                          ? 'text-forest font-bold'
                          : 'text-red font-bold'
                      }
                    >
                      {selectedCandidate.test_accuracy - (deployedModel?.test_accuracy || 0.9714) > 0 ? '+' : ''}
                      {((selectedCandidate.test_accuracy - (deployedModel?.test_accuracy || 0.9714)) * 100).toFixed(2)}{' '}
                      pp
                    </span>
                  </p>
                  <p>
                    Macro F1 Change:{' '}
                    <span
                      className={
                        selectedCandidate.macro_f1 - (deployedModel?.macro_f1 || 0.9714) >= 0
                          ? 'text-forest font-bold'
                          : 'text-red font-bold'
                      }
                    >
                      {selectedCandidate.macro_f1 - (deployedModel?.macro_f1 || 0.9714) >= 0 ? '+' : ''}
                      {(selectedCandidate.macro_f1 - (deployedModel?.macro_f1 || 0.9714)).toFixed(4)}
                    </span>
                  </p>
                </div>

                <div
                  className="rounded-lg p-3 border text-xs"
                  style={{
                    background: selectedCandidate.status === 'ELIGIBLE_FOR_REVIEW' ? '#f0fff4' : '#fff5f5',
                    borderColor: selectedCandidate.status === 'ELIGIBLE_FOR_REVIEW' ? '#c6f6d5' : '#fed7d7',
                    color: selectedCandidate.status === 'ELIGIBLE_FOR_REVIEW' ? '#2f855a' : '#c53030',
                  }}
                >
                  <strong className="block text-sm">
                    {selectedCandidate.status === 'ELIGIBLE_FOR_REVIEW' ? 'ELIGIBLE FOR DEPLOYMENT REVIEW' : 'CANDIDATE REJECTED'}
                  </strong>
                  <span className="block mt-0.5">
                    {selectedCandidate.status === 'ELIGIBLE_FOR_REVIEW'
                      ? 'Candidate Outperformed Current Model'
                      : 'Keep Current Round 2 Model'}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-forest-muted italic py-6">No candidate model loaded.</p>
            )}
          </div>
        </div>

        {/* Previous Candidates table */}
        {candidates.length > 0 && (
          <div className="space-y-3 pt-3 border-t border-beige/60">
            <h3 className="font-bold text-forest text-sm">Previously Uploaded Candidates</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Uploaded At</th>
                    <th>Filename</th>
                    <th>Accuracy</th>
                    <th>Macro F1</th>
                    <th>Accuracy Delta</th>
                    <th>F1 Delta</th>
                    <th>Source Batch</th>
                    <th>Decision</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c) => {
                    const baselineAcc = deployedModel?.test_accuracy || 0.9714
                    const baselineF1 = deployedModel?.macro_f1 || 0.9714
                    const accDelta = (c.test_accuracy - baselineAcc) * 100
                    const f1Delta = c.macro_f1 - baselineF1
                    return (
                      <tr key={c.candidate_id} style={{ background: selectedCandidate?.candidate_id === c.candidate_id ? '#f4fbf6' : 'none' }}>
                        <td className="text-xs text-forest-muted">{new Date(c.uploaded_at).toLocaleString()}</td>
                        <td className="font-mono text-xs text-forest-light">
                          {c.checkpoint_pruned_at ? (
                            <span className="text-xs text-forest-muted">Pruned checkpoint</span>
                          ) : (
                            c.filename
                          )}
                        </td>
                        <td className="text-xs text-forest">{(c.test_accuracy * 100).toFixed(2)}%</td>
                        <td className="text-xs text-forest">{c.macro_f1.toFixed(4)}</td>
                        <td className={accDelta > 0 ? 'text-forest font-bold text-xs' : 'text-red text-xs'}>
                          {accDelta > 0 ? '+' : ''}
                          {accDelta.toFixed(2)} pp
                        </td>
                        <td className={f1Delta >= 0 ? 'text-forest font-bold text-xs' : 'text-red text-xs'}>
                          {f1Delta >= 0 ? '+' : ''}
                          {f1Delta.toFixed(4)}
                        </td>
                        <td className="text-xs text-forest-muted">{c.source_batch_id || 'N/A'}</td>
                        <td>
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-bold"
                            style={{
                              background: c.status === 'ELIGIBLE_FOR_REVIEW' ? '#c6f6d5' : '#fed7d7',
                              color: c.status === 'ELIGIBLE_FOR_REVIEW' ? '#22543d' : '#742a2a',
                            }}
                          >
                            {c.status === 'ELIGIBLE_FOR_REVIEW' ? 'Review Eligible' : 'Rejected'}
                          </span>
                        </td>
                        <td className="text-right">
                          <button
                            onClick={() => setSelectedCandidate(c)}
                            className="primary-btn text-xs py-1 px-2.5 rounded-lg"
                            style={{ width: 'auto', padding: '4px 10px', fontSize: '0.8rem' }}
                          >
                            Compare
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* 5. In-App Fine Tuning (Real PyTorch) */}
      <FineTuningPanel />

      {/* Demo batch Warning Modal */}
      {warningModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '500px' }}>
            <h3 style={{ color: '#dd6b20', marginBottom: '1rem', fontWeight: 'bold' }}>Demo Batch Warning</h3>
            <p style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#4a5568' }}>
              This batch contains fewer than the recommended 100 expert-verified samples.
            </p>
            <p style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#4a5568' }}>
              The controlled PaddyGuard Active Learning experiments used 100 newly labelled samples per round.
            </p>
            <p style={{ marginBottom: '1.5rem', padding: '1rem', background: '#fffaf0', borderRadius: '4px', fontSize: '0.85rem', color: '#b45309' }}>
              You may continue for demonstration purposes, but this batch is not equivalent to a new controlled research round.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setWarningModalOpen(false)}
                className="btn-secondary"
                style={{ width: 'auto', padding: '8px 16px' }}
              >
                Cancel
              </button>
              <button
                onClick={executePrepare}
                disabled={isPreparingBatch}
                className="primary-submit-btn"
                style={{ width: 'auto', padding: '8px 16px', background: '#dd6b20' }}
              >
                {isPreparingBatch ? 'Preparing...' : 'Prepare Demo Batch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
