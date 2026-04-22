"use client";

import { memo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Trash2 } from "lucide-react";

const DELETE_CONFIRMATION_TEXT = "حذف";

interface DeleteAccountDialogProps {
	onConfirm: () => void;
}

function DeleteAccountDialog({ onConfirm }: DeleteAccountDialogProps) {
	const [open, setOpen] = useState(false);
	const [confirmText, setConfirmText] = useState("");
	const isConfirmed = confirmText === DELETE_CONFIRMATION_TEXT;

	const handleOpenChange = useCallback((newOpen: boolean) => {
		setOpen(newOpen);
		if (!newOpen) {
			setConfirmText("");
		}
	}, []);

	const handleConfirm = useCallback(() => {
		if (isConfirmed) {
			onConfirm();
			setOpen(false);
			setConfirmText("");
		}
	}, [isConfirmed, onConfirm]);

	const handleCancel = useCallback(() => {
		setOpen(false);
		setConfirmText("");
	}, []);

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<Button variant="destructive" aria-label="حذف الحساب نهائياً">
					<Trash2 className="ml-2 h-4 w-4" aria-hidden="true" />
					حذف الحساب نهائياً
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>هل أنت متأكد؟</DialogTitle>
					<DialogDescription>
						هذا الإجراء لا يمكن التراجع عنه. سيتم حذف حسابك بشكل دائم وجميع بياناتك المرتبطة به.
						<br />
						<br />
						يرجى كتابة <strong>{DELETE_CONFIRMATION_TEXT}</strong> في الحقل أدناه للتأكيد.
					</DialogDescription>
				</DialogHeader>
				<div className="py-4">
					<Input
						placeholder={`اكتب '${DELETE_CONFIRMATION_TEXT}' للتأكيد`}
						value={confirmText}
						onChange={(e) => setConfirmText(e.target.value)}
						aria-label="نص التأكيد"
						aria-invalid={!isConfirmed && confirmText.length > 0}
					/>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={handleCancel} aria-label="إلغاء حذف الحساب">
						إلغاء
					</Button>
					<Button
						variant="destructive"
						onClick={handleConfirm}
						disabled={!isConfirmed}
						aria-label="تأكيد حذف الحساب"
					>
						حذف الحساب
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export default memo(DeleteAccountDialog);
