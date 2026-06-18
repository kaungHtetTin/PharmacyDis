import { useEffect, useRef, useState } from 'react';
import FormField from '../../components/shared/FormField';
import Icon from '../../components/shared/Icon';
import Modal from '../../components/shared/Modal';
import PageHeader from '../../components/shared/PageHeader';
import Panel from '../../components/shared/Panel';
import { api } from '../../services/apiClient';
import { useAuth } from '../../services/auth.jsx';

const blankForm = {
    current_password: '',
    email: '',
    name: '',
    password: '',
    password_confirmation: '',
    phone: '',
};

const defaultCrop = { x: 0, y: 0, zoom: 1.2 };

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function storageUrl(path) {
    if (!path) {
        return '';
    }

    if (/^(https?:)?\/\//.test(path) || path.startsWith('data:') || path.startsWith('blob:')) {
        return path;
    }

    const baseUrl = String(window.appConfig?.baseUrl || '').replace(/\/+$/g, '');
    const normalizedPath = String(path).replace(/^\/+/, '').replace(/^storage\//, '');

    return `${baseUrl}/storage/${normalizedPath}`;
}

function initials(name) {
    return String(name || 'Admin User')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();
}

function formatRoleName(role) {
    const label = role?.display_name || role?.name || '';

    return label
        ? String(label).replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
        : 'Office Admin';
}

function getCropSourceRect(imageSize, crop) {
    if (!imageSize?.width || !imageSize?.height) {
        return { cropSize: 0, sourceX: 0, sourceY: 0 };
    }

    const naturalSize = Math.min(imageSize.width, imageSize.height);
    const cropSize = naturalSize / Number(crop.zoom || 1);
    const maxX = Math.max(0, (imageSize.width - cropSize) / 2);
    const maxY = Math.max(0, (imageSize.height - cropSize) / 2);
    const sourceX = Math.min(imageSize.width - cropSize, Math.max(0, (imageSize.width - cropSize) / 2 + (Number(crop.x || 0) / 100) * maxX));
    const sourceY = Math.min(imageSize.height - cropSize, Math.max(0, (imageSize.height - cropSize) / 2 + (Number(crop.y || 0) / 100) * maxY));

    return { cropSize, sourceX, sourceY };
}

function getCropPreviewStyle(imageSize, crop) {
    if (!imageSize?.width || !imageSize?.height) {
        return {};
    }

    const { cropSize, sourceX, sourceY } = getCropSourceRect(imageSize, crop);

    return {
        height: `${(imageSize.height / cropSize) * 100}%`,
        left: `${-(sourceX / cropSize) * 100}%`,
        top: `${-(sourceY / cropSize) * 100}%`,
        width: `${(imageSize.width / cropSize) * 100}%`,
    };
}

function cropImageToBlob(imageSource, crop) {
    return new Promise((resolve, reject) => {
        const image = new Image();

        image.onload = () => {
            const canvas = document.createElement('canvas');
            const size = 512;
            const { cropSize, sourceX, sourceY } = getCropSourceRect({
                height: image.naturalHeight,
                width: image.naturalWidth,
            }, crop);
            const context = canvas.getContext('2d');

            canvas.width = size;
            canvas.height = size;
            context.drawImage(image, sourceX, sourceY, cropSize, cropSize, 0, 0, size, size);
            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error('Could not crop profile image.'));
                    return;
                }

                resolve(blob);
            }, 'image/jpeg', 0.9);
        };
        image.onerror = () => reject(new Error('Could not load selected profile image.'));
        image.src = imageSource;
    });
}

export default function OfficeProfilePage({ onNavigate }) {
    const { setUser, user } = useAuth();
    const cropFrameRef = useRef(null);
    const cropDragRef = useRef(null);
    const [form, setForm] = useState(blankForm);
    const [imageSource, setImageSource] = useState('');
    const [imageSize, setImageSize] = useState(null);
    const [croppedImageBlob, setCroppedImageBlob] = useState(null);
    const [croppedImageUrl, setCroppedImageUrl] = useState('');
    const [pendingImageName, setPendingImageName] = useState('');
    const [selectedImageName, setSelectedImageName] = useState('');
    const [crop, setCrop] = useState(defaultCrop);
    const [cropDialogOpen, setCropDialogOpen] = useState(false);
    const [cropApplying, setCropApplying] = useState(false);
    const [cropDragging, setCropDragging] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const currentImageUrl = croppedImageUrl || storageUrl(user?.profile_image_path);
    const profileRole = formatRoleName(user?.role);
    const contactFacts = [
        { label: 'Email', value: form.email || '-' },
        { label: 'Phone', value: form.phone || '-' },
        { label: 'Access', value: profileRole },
    ];

    useEffect(() => {
        setForm((current) => ({
            ...current,
            email: user?.email || '',
            name: user?.name || '',
            phone: user?.phone || '',
        }));
    }, [user?.email, user?.name, user?.phone]);

    useEffect(() => () => {
        if (imageSource?.startsWith('blob:')) {
            URL.revokeObjectURL(imageSource);
        }
    }, [imageSource]);

    useEffect(() => () => {
        if (croppedImageUrl?.startsWith('blob:')) {
            URL.revokeObjectURL(croppedImageUrl);
        }
    }, [croppedImageUrl]);

    function updateForm(event) {
        setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
        setError('');
        setSuccess('');
    }

    function updateCrop(key, value) {
        setCrop((current) => ({ ...current, [key]: Number(value) }));
    }

    function updateZoom(nextZoom) {
        setCrop((current) => ({ ...current, zoom: clamp(Number(nextZoom), 1, 3) }));
    }

    function selectProfileImage(event) {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        if (imageSource?.startsWith('blob:')) {
            URL.revokeObjectURL(imageSource);
        }

        const nextImageSource = URL.createObjectURL(file);
        const image = new Image();

        image.onload = () => {
            setImageSize({ height: image.naturalHeight, width: image.naturalWidth });
        };
        image.src = nextImageSource;

        setImageSource(nextImageSource);
        setPendingImageName(file.name);
        setCrop(defaultCrop);
        setCropDialogOpen(true);
        setError('');
        setSuccess('');
        event.target.value = '';
    }

    function closeCropDialog() {
        if (cropApplying) {
            return;
        }

        if (imageSource?.startsWith('blob:')) {
            URL.revokeObjectURL(imageSource);
        }

        setCropDialogOpen(false);
        setImageSource('');
        setImageSize(null);
        setPendingImageName('');
        setCrop(defaultCrop);
        setCropDragging(false);
        cropDragRef.current = null;
    }

    async function applyCroppedImage() {
        if (!imageSource) {
            return;
        }

        setCropApplying(true);
        setError('');

        try {
            const croppedImage = await cropImageToBlob(imageSource, crop);
            const nextPreviewUrl = URL.createObjectURL(croppedImage);

            if (croppedImageUrl?.startsWith('blob:')) {
                URL.revokeObjectURL(croppedImageUrl);
            }
            if (imageSource?.startsWith('blob:')) {
                URL.revokeObjectURL(imageSource);
            }

            setCroppedImageBlob(croppedImage);
            setCroppedImageUrl(nextPreviewUrl);
            setSelectedImageName(pendingImageName);
            setImageSource('');
            setImageSize(null);
            setPendingImageName('');
            setCropDialogOpen(false);
            setCropDragging(false);
            cropDragRef.current = null;
        } catch (cropError) {
            setError(cropError.message);
        } finally {
            setCropApplying(false);
        }
    }

    function resetCrop() {
        setCrop(defaultCrop);
    }

    function startCropDrag(event) {
        if (!imageSize || event.button !== 0) {
            return;
        }

        cropDragRef.current = {
            crop,
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
        };
        setCropDragging(true);
        event.currentTarget.setPointerCapture?.(event.pointerId);
    }

    function moveCropDrag(event) {
        const drag = cropDragRef.current;
        const frame = cropFrameRef.current;

        if (!drag || drag.pointerId !== event.pointerId || !frame || !imageSize) {
            return;
        }

        const rect = frame.getBoundingClientRect();
        const { cropSize } = getCropSourceRect(imageSize, drag.crop);
        const maxX = Math.max(0, (imageSize.width - cropSize) / 2);
        const maxY = Math.max(0, (imageSize.height - cropSize) / 2);
        const deltaSourceX = -((event.clientX - drag.startX) / Math.max(1, rect.width)) * cropSize;
        const deltaSourceY = -((event.clientY - drag.startY) / Math.max(1, rect.height)) * cropSize;
        const deltaX = maxX > 0 ? (deltaSourceX / maxX) * 100 : 0;
        const deltaY = maxY > 0 ? (deltaSourceY / maxY) * 100 : 0;

        setCrop((current) => ({
            ...current,
            x: clamp(drag.crop.x + deltaX, -100, 100),
            y: clamp(drag.crop.y + deltaY, -100, 100),
        }));
    }

    function endCropDrag(event) {
        if (cropDragRef.current?.pointerId === event.pointerId) {
            cropDragRef.current = null;
            setCropDragging(false);
            event.currentTarget.releasePointerCapture?.(event.pointerId);
        }
    }

    function handleCropWheel(event) {
        event.preventDefault();
        const direction = event.deltaY > 0 ? -1 : 1;
        updateZoom(crop.zoom + direction * 0.08);
    }

    async function submitProfile(event) {
        event.preventDefault();
        setSaving(true);
        setError('');
        setSuccess('');

        try {
            const payload = new FormData();

            Object.entries(form).forEach(([key, value]) => payload.append(key, value || ''));

            if (croppedImageBlob) {
                payload.append('profile_image', croppedImageBlob, 'profile.jpg');
            }

            const updatedUser = await api.post('/office/profile', payload, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setUser(updatedUser);
            if (croppedImageUrl?.startsWith('blob:')) {
                URL.revokeObjectURL(croppedImageUrl);
            }
            setCroppedImageBlob(null);
            setCroppedImageUrl('');
            setSelectedImageName('');
            setForm((current) => ({
                ...current,
                current_password: '',
                password: '',
                password_confirmation: '',
            }));
            setSuccess('Profile updated.');
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <form className="office-profile-page" onSubmit={submitProfile}>
            <PageHeader
                action={(
                    <div className="page-heading-actions">
                        <button className="btn primary" disabled={saving} type="submit">{saving ? 'Saving...' : 'Save profile'}</button>
                        <button className="btn secondary" disabled={saving} onClick={() => onNavigate?.('dashboard')} type="button">Cancel</button>
                    </div>
                )}
                description="Manage your office identity, contact details, profile photo, and sign-in security."
                eyebrow="Profile"
                title="Profile settings"
            />

            {(error || success) && (
                <div className={`office-profile-alert ${error ? 'is-error' : 'is-success'}`}>
                    <Icon name={error ? 'close' : 'check'} size={16} />
                    <span>{error || success}</span>
                </div>
            )}

            <section className="office-profile-shell">
                <aside className="office-profile-card glass">
                    <div className="office-profile-card-head">
                        <div className="profile-avatar-preview office-profile-avatar">
                            {currentImageUrl ? (
                                <img alt="Profile preview" src={currentImageUrl} />
                            ) : (
                                <strong>{initials(form.name)}</strong>
                            )}
                        </div>
                        <div>
                            <p className="eyebrow">Office Profile</p>
                            <h2>{form.name || 'Admin User'}</h2>
                            <span>{profileRole}</span>
                        </div>
                    </div>

                    <div className="office-profile-fact-list">
                        {contactFacts.map((fact) => (
                            <article key={fact.label}>
                                <span>{fact.label}</span>
                                <strong>{fact.value}</strong>
                            </article>
                        ))}
                    </div>

                    <label className="file-upload-control profile-image-upload office-profile-upload">
                        <input accept="image/*" aria-label="Profile image" onChange={selectProfileImage} type="file" />
                        <span className="file-upload-icon"><Icon name="image" size={20} /></span>
                        <span className="file-upload-copy">
                            <strong>{selectedImageName || 'Choose profile image'}</strong>
                            <small>Crop a square image for the office app bar and profile menus.</small>
                        </span>
                    </label>
                    {selectedImageName && <small className="office-profile-ready-note">Photo is cropped and ready. Save profile to apply it.</small>}
                </aside>

                <div className="office-profile-form-stack">
                    <Panel className="office-profile-panel" eyebrow="Account" title="Personal information">
                        <div className="office-profile-section-copy">
                            <Icon name="user" size={18} />
                            <p>Keep your displayed account details current for office workflows, audit trails, and internal communication.</p>
                        </div>
                        <div className="crud-grid office-profile-form-grid">
                            <FormField label="Full name" name="name" onChange={updateForm} required value={form.name} />
                            <FormField label="Email address" name="email" onChange={updateForm} required type="email" value={form.email} />
                            <FormField label="Phone number" name="phone" onChange={updateForm} value={form.phone} />
                            <label className="form-field">
                                <span>Role</span>
                                <input disabled readOnly value={profileRole} />
                            </label>
                        </div>
                    </Panel>

                    <Panel className="office-profile-panel" eyebrow="Security" title="Change password">
                        <div className="office-profile-section-copy">
                            <Icon name="settings" size={18} />
                            <p>Leave password fields blank to keep your current password. Use at least 8 characters when changing it.</p>
                        </div>
                        <div className="crud-grid office-profile-form-grid">
                            <FormField label="Current password" name="current_password" onChange={updateForm} type="password" value={form.current_password} />
                            <FormField label="New password" minLength="8" name="password" onChange={updateForm} placeholder="At least 8 characters" type="password" value={form.password} />
                            <FormField label="Confirm password" minLength="8" name="password_confirmation" onChange={updateForm} type="password" value={form.password_confirmation} />
                        </div>
                    </Panel>
                </div>
            </section>

            <Modal
                actions={(
                    <>
                        <button className="btn secondary" disabled={cropApplying} onClick={closeCropDialog} type="button">Cancel</button>
                        <button className="btn primary" disabled={cropApplying} onClick={applyCroppedImage} type="button">{cropApplying ? 'Applying...' : 'Use photo'}</button>
                    </>
                )}
                busy={cropApplying}
                onClose={closeCropDialog}
                open={cropDialogOpen}
                title="Crop profile photo"
            >
                <div className="profile-crop-dialog">
                    <div
                        ref={cropFrameRef}
                        className={`profile-crop-frame profile-crop-frame-large${cropDragging ? ' is-dragging' : ''}`}
                        onPointerCancel={endCropDrag}
                        onPointerDown={startCropDrag}
                        onPointerMove={moveCropDrag}
                        onPointerUp={endCropDrag}
                        onWheel={handleCropWheel}
                    >
                        {imageSource ? (
                            <img
                                draggable="false"
                                alt="Profile crop preview"
                                src={imageSource}
                                style={getCropPreviewStyle(imageSize, crop)}
                            />
                        ) : (
                            <strong>{initials(form.name)}</strong>
                        )}
                    </div>
                    <section className="profile-crop-controls">
                        <div className="profile-crop-toolbar">
                            <button className="icon-btn small" disabled={crop.zoom <= 1} onClick={() => updateZoom(crop.zoom - 0.1)} type="button">
                                <Icon name="minus" size={15} />
                            </button>
                            <button className="btn secondary" onClick={resetCrop} type="button">Reset</button>
                            <button className="icon-btn small" disabled={crop.zoom >= 3} onClick={() => updateZoom(crop.zoom + 0.1)} type="button">
                                <Icon name="plus" size={15} />
                            </button>
                        </div>
                        <label>
                            <span>Zoom</span>
                            <input max="3" min="1" onChange={(event) => updateZoom(event.target.value)} step="0.05" type="range" value={crop.zoom} />
                        </label>
                        <label>
                            <span>Horizontal</span>
                            <input max="100" min="-100" onChange={(event) => updateCrop('x', event.target.value)} step="1" type="range" value={crop.x} />
                        </label>
                        <label>
                            <span>Vertical</span>
                            <input max="100" min="-100" onChange={(event) => updateCrop('y', event.target.value)} step="1" type="range" value={crop.y} />
                        </label>
                    </section>
                </div>
            </Modal>
        </form>
    );
}
