import React, { useEffect, useMemo, useState } from 'react';
import {
    createQuiz,
    deleteAdminQuiz,
    getAdminQuizzes,
    getAdminUsers,
    mergeAdminQuizzes,
} from '../api';
import { ChartIcon, DashboardIcon, QuizIcon, TrophyIcon } from '../components/Icons';

const EMPTY_QUESTION = () => ({
    id: Math.random().toString(36).slice(2),
    question: '',
    options: ['', '', '', ''],
    correctAnswer: '',
});

export default function AdminPage() {
    const [activeTab, setActiveTab] = useState('create');
    const [form, setForm] = useState({ title: '', category: '' });
    const [questions, setQuestions] = useState([EMPTY_QUESTION()]);
    const [jsonInput, setJsonInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [adminQuizzes, setAdminQuizzes] = useState([]);
    const [adminUsers, setAdminUsers] = useState([]);
    const [managementLoading, setManagementLoading] = useState(false);
    const [selectedForMerge, setSelectedForMerge] = useState([]);
    const [mergeMeta, setMergeMeta] = useState({ title: '', category: '' });

    const totalQuestions = questions.length;

    const userStats = useMemo(() => {
        const total = adminUsers.length;
        const admins = adminUsers.filter((u) => u.role === 'admin').length;
        const active = adminUsers.filter((u) => (u.attemptCount || 0) > 0).length;
        return { total, admins, active };
    }, [adminUsers]);

    const loadAdminData = async () => {
        setManagementLoading(true);
        try {
            const [quizRes, userRes] = await Promise.all([getAdminQuizzes(), getAdminUsers()]);
            setAdminQuizzes(quizRes.data.quizzes || []);
            setAdminUsers(userRes.data.users || []);
        } catch (e) {
            setError(e.response?.data?.message || 'Failed to load admin data.');
        } finally {
            setManagementLoading(false);
        }
    };

    useEffect(() => {
        loadAdminData();
    }, []);

    const resetMessages = () => {
        setError('');
        setSuccess('');
    };

    const handleFormChange = (e) => {
        setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
        resetMessages();
    };

    const handleQuestionChange = (id, field, value) => {
        setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, [field]: value } : q)));
    };

    const handleOptionChange = (qId, idx, value) => {
        setQuestions((qs) =>
            qs.map((q) => {
                if (q.id !== qId) return q;
                const opts = [...q.options];
                opts[idx] = value;
                return { ...q, options: opts };
            })
        );
    };

    const addQuestion = () => setQuestions((p) => [...p, EMPTY_QUESTION()]);
    const removeQuestion = (id) => {
        if (questions.length === 1) return;
        setQuestions((p) => p.filter((q) => q.id !== id));
    };

    const validateCreate = () => {
        if (!form.title.trim()) return 'Quiz title is required.';
        if (!form.category.trim()) return 'Category is required.';
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            if (!q.question.trim()) return `Question ${i + 1}: question text is required.`;
            if (q.options.some((o) => !o.trim())) return `Question ${i + 1}: all 4 options are required.`;
            if (q.correctAnswer === '') return `Question ${i + 1}: select a correct answer.`;
        }
        return null;
    };

    const handleJsonImport = () => {
        resetMessages();
        if (!jsonInput.trim()) return setError('Paste quiz JSON first.');

        try {
            const parsed = JSON.parse(jsonInput);
            if (!parsed?.title || !parsed?.category || !Array.isArray(parsed?.questions)) {
                return setError('JSON must contain title, category and questions array.');
            }

            const mapped = parsed.questions.map((q, idx) => {
                if (!q?.question || !Array.isArray(q?.options) || q.options.length !== 4) {
                    throw new Error(`Question ${idx + 1}: must include question and exactly 4 options.`);
                }
                const correctAnswer = String(q.correctAnswer);
                if (!['0', '1', '2', '3'].includes(correctAnswer)) {
                    throw new Error(`Question ${idx + 1}: correctAnswer must be 0, 1, 2, or 3.`);
                }
                return {
                    id: Math.random().toString(36).slice(2),
                    question: q.question,
                    options: q.options.map((opt) => String(opt)),
                    correctAnswer,
                };
            });

            setForm({ title: String(parsed.title), category: String(parsed.category) });
            setQuestions(mapped);
            setSuccess(`Imported ${mapped.length} questions from JSON.`);
        } catch (e) {
            setError(e.message || 'Invalid JSON format.');
        }
    };

    const handleCreateQuiz = async (e) => {
        e.preventDefault();
        const err = validateCreate();
        if (err) return setError(err);

        setLoading(true);
        resetMessages();
        try {
            await createQuiz({
                title: form.title.trim(),
                category: form.category.trim(),
                questions: questions.map(({ question, options, correctAnswer }) => ({
                    question,
                    options,
                    correctAnswer,
                })),
            });
            setSuccess(`Quiz "${form.title}" created successfully.`);
            setForm({ title: '', category: '' });
            setQuestions([EMPTY_QUESTION()]);
            setJsonInput('');
            await loadAdminData();
        } catch (e) {
            setError(e.response?.data?.message || 'Failed to create quiz.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteQuiz = async (quizId, quizTitle) => {
        resetMessages();
        const ok = window.confirm(`Delete "${quizTitle}"? This also deletes related attempts.`);
        if (!ok) return;

        try {
            await deleteAdminQuiz(quizId);
            setSuccess('Quiz deleted successfully.');
            setAdminQuizzes((prev) => prev.filter((q) => q.id !== quizId));
            setSelectedForMerge((prev) => prev.filter((id) => id !== quizId));
        } catch (e) {
            setError(e.response?.data?.message || 'Failed to delete quiz.');
        }
    };

    const toggleMergeSelection = (quizId) => {
        setSelectedForMerge((prev) =>
            prev.includes(quizId) ? prev.filter((id) => id !== quizId) : [...prev, quizId]
        );
    };

    const handleMerge = async () => {
        resetMessages();
        if (selectedForMerge.length < 2) return setError('Select at least 2 quizzes to merge.');
        if (!mergeMeta.title.trim() || !mergeMeta.category.trim()) {
            return setError('Merged quiz title and category are required.');
        }

        try {
            const res = await mergeAdminQuizzes({
                sourceQuizIds: selectedForMerge,
                title: mergeMeta.title.trim(),
                category: mergeMeta.category.trim(),
            });
            setSuccess(`${res.data?.message}.`);
            setSelectedForMerge([]);
            setMergeMeta({ title: '', category: '' });
            await loadAdminData();
        } catch (e) {
            setError(e.response?.data?.message || 'Failed to merge quizzes.');
        }
    };

    return (
        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3rem', maxWidth: '1360px' }}>
            <div style={{ marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>Admin Console</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Manage quizzes, users and assessment operations.</p>
            </div>

            {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
            {success && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{success}</div>}

            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <button className={`btn ${activeTab === 'create' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('create')}>
                    <QuizIcon size={16} /> Create & Import
                </button>
                <button className={`btn ${activeTab === 'manage' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('manage')}>
                    <DashboardIcon size={16} /> Manage Quizzes
                </button>
                <button className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('users')}>
                    <ChartIcon size={16} /> Users
                </button>
            </div>

            {activeTab === 'create' && (
                <form onSubmit={handleCreateQuiz}>
                    <div className="card" style={{ marginBottom: '1rem' }}>
                        <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Assessment Configuration</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: '1rem' }}>
                            <div className="form-group">
                                <label className="form-label">Title</label>
                                <input className="form-input" name="title" value={form.title} onChange={handleFormChange} placeholder="Operating Systems Interview Questions" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Category</label>
                                <input className="form-input" name="category" value={form.category} onChange={handleFormChange} placeholder="OS" />
                            </div>
                        </div>
                    </div>

                    <div className="card" style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                            <h2 style={{ fontSize: '1.1rem' }}>Quick Import JSON</h2>
                            <button type="button" className="btn btn-secondary btn-sm" onClick={handleJsonImport}>Import JSON</button>
                        </div>
                        <textarea
                            className="form-input"
                            rows={10}
                            style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                            value={jsonInput}
                            onChange={(e) => setJsonInput(e.target.value)}
                            placeholder='{"title":"Operating Systems Interview Questions","category":"OS","questions":[...]}'
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem' }}>
                        {questions.map((q, i) => (
                            <div key={q.id} className="card" style={{ borderTop: '3px solid var(--primary)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                    <h3 style={{ fontSize: '1rem' }}>Question {i + 1}</h3>
                                    {questions.length > 1 && (
                                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeQuestion(q.id)}>Remove</button>
                                    )}
                                </div>
                                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                                    <label className="form-label">Prompt</label>
                                    <textarea className="form-input" rows={2} value={q.question} onChange={(e) => handleQuestionChange(q.id, 'question', e.target.value)} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                    {q.options.map((opt, optIdx) => (
                                        <input
                                            key={optIdx}
                                            className="form-input"
                                            value={opt}
                                            onChange={(e) => handleOptionChange(q.id, optIdx, e.target.value)}
                                            placeholder={`Option ${optIdx + 1}`}
                                        />
                                    ))}
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    {[0, 1, 2, 3].map((optIdx) => (
                                        <button
                                            key={optIdx}
                                            type="button"
                                            className={`btn btn-sm ${q.correctAnswer === String(optIdx) ? 'btn-primary' : 'btn-secondary'}`}
                                            onClick={() => handleQuestionChange(q.id, 'correctAnswer', String(optIdx))}
                                        >
                                            Correct {optIdx + 1}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <button type="button" className="btn btn-secondary" onClick={addQuestion}>Add Question</button>
                        <div style={{ marginLeft: 'auto', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Total: {totalQuestions}</div>
                        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Publish Quiz'}</button>
                    </div>
                </form>
            )}

            {activeTab === 'manage' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
                    <div className="card">
                        <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>All Quizzes</h2>
                        {managementLoading ? (
                            <div className="spinner" />
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                                {adminQuizzes.map((q) => (
                                    <div key={q.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.75rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontWeight: 600 }}>{q.title}</div>
                                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                                    {q.category} • {q.questionCount} questions
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button
                                                    className={`btn btn-sm ${selectedForMerge.includes(q.id) ? 'btn-primary' : 'btn-secondary'}`}
                                                    onClick={() => toggleMergeSelection(q.id)}
                                                >
                                                    {selectedForMerge.includes(q.id) ? 'Selected' : 'Merge'}
                                                </button>
                                                <button className="btn btn-danger btn-sm" onClick={() => handleDeleteQuiz(q.id, q.title)}>
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="card">
                        <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Merge Quizzes</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                            Select two or more quizzes from the list and create a combined quiz.
                        </p>
                        <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                            <label className="form-label">Merged Quiz Title</label>
                            <input className="form-input" value={mergeMeta.title} onChange={(e) => setMergeMeta((p) => ({ ...p, title: e.target.value }))} />
                        </div>
                        <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                            <label className="form-label">Merged Category</label>
                            <input className="form-input" value={mergeMeta.category} onChange={(e) => setMergeMeta((p) => ({ ...p, category: e.target.value }))} />
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                            Selected quizzes: {selectedForMerge.length}
                        </div>
                        <button className="btn btn-primary" onClick={handleMerge}>Merge Selected Quizzes</button>
                    </div>
                </div>
            )}

            {activeTab === 'users' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: '1rem' }}>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'var(--primary-light)' }}><ChartIcon size={18} /></div>
                        <div className="stat-value">{userStats.total}</div>
                        <div className="stat-label">Total Users</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'var(--warning-bg)' }}><TrophyIcon size={18} /></div>
                        <div className="stat-value">{userStats.admins}</div>
                        <div className="stat-label">Admins</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'var(--success-bg)' }}><QuizIcon size={18} /></div>
                        <div className="stat-value">{userStats.active}</div>
                        <div className="stat-label">Active Learners</div>
                    </div>
                    <div className="card" style={{ gridColumn: '1 / -1' }}>
                        <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>User Directory</h2>
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Attempts</th>
                                        <th>Best Score</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {adminUsers.map((u) => (
                                        <tr key={u._id}>
                                            <td>{u.name}</td>
                                            <td>{u.email}</td>
                                            <td>{u.role}</td>
                                            <td>{u.attemptCount || 0}</td>
                                            <td>{u.bestScore || 0}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
