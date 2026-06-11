package main

import (
	"math/big"

	"github.com/vlmoon99/near-sdk-go/env"
	"github.com/vlmoon99/near-sdk-go/types"
)

// WishEntry represents a single wish with a NEAR donation
type WishEntry struct {
	Sender    string `json:"sender"`
	Message   string `json:"message"`
	AmountStr string `json:"amount_str"` // yoctoNEAR as string
	Timestamp uint64 `json:"timestamp"`   // nanoseconds since epoch
}

// @contract:state
type Contract struct {
	Wishes    []WishEntry `json:"wishes"`
	TotalNear string      `json:"total_near"` // yoctoNEAR as string
	Owner     string      `json:"owner"`
}

// @contract:init
func (c *Contract) Init(owner string) {
	c.Owner = owner
	c.TotalNear = "0"
	c.Wishes = []WishEntry{}
	env.LogString("WishWall contract initialized!")
}

// @contract:mutating
// @contract:payable
func (c *Contract) AddWish(message string) {
	if len(message) == 0 {
		env.PanicStr("Message cannot be empty")
	}
	if len(message) > 500 {
		env.PanicStr("Message too long, max 500 characters")
	}

	deposit, err := env.GetAttachedDeposit()
	if err != nil {
		env.PanicStr("Failed to get attached deposit: " + err.Error())
	}
	
	sender, err := env.GetPredecessorAccountID()
	if err != nil {
		env.PanicStr("Failed to get predecessor account: " + err.Error())
	}

	timestamp := env.GetBlockTimeMs()

	wish := WishEntry{
		Sender:    sender,
		Message:   message,
		AmountStr: deposit.String(),
		Timestamp: timestamp,
	}

	c.Wishes = append(c.Wishes, wish)

	// Update running total
	total, ok := new(big.Int).SetString(c.TotalNear, 10)
	if !ok {
		total = big.NewInt(0)
	}
	
	depInt, ok := new(big.Int).SetString(deposit.String(), 10)
	if !ok {
		depInt = big.NewInt(0)
	}
	total.Add(total, depInt)
	c.TotalNear = total.String()

	env.LogString("Wish added to the wall!")
}

// @contract:view
func (c *Contract) GetWishes() []WishEntry {
	return c.Wishes
}

// @contract:view
func (c *Contract) GetTotalNear() string {
	return c.TotalNear
}

// @contract:view
func (c *Contract) GetWishCount() int {
	return len(c.Wishes)
}

// @contract:view
func (c *Contract) GetOwner() string {
	return c.Owner
}

// @contract:mutating
func (c *Contract) Withdraw() {
	sender, err := env.GetPredecessorAccountID()
	if err != nil {
		env.PanicStr("Failed to get predecessor account: " + err.Error())
	}
	
	if sender != c.Owner {
		env.PanicStr("Only owner can withdraw funds")
	}

	amount128, err := types.U128FromString(c.TotalNear)
	if err != nil {
		env.PanicStr("Failed to parse TotalNear: " + err.Error())
	}

	promiseId := env.PromiseBatchCreate([]byte(c.Owner))
	env.PromiseBatchActionTransfer(promiseId, amount128)

	c.TotalNear = "0"
	env.LogString("Funds withdrawn successfully!")
}

